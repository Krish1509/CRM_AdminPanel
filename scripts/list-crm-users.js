const mongoose = require('mongoose');

// User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, sparse: true },
  phoneNumber: { type: String, sparse: true },
  role: { type: String, enum: ['superadmin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  loginCount: { type: Number, default: 0 },
  accountLocked: { type: Boolean, default: false },
  preferences: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    language: { type: String, enum: ['en', 'es', 'fr'], default: 'en' }
  },
  metadata: {
    createdBy: { type: String, default: 'system' },
    department: { type: String, default: 'IT' },
    employeeId: { type: String }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function listCRMUsers() {
  try {
    // Connect directly to CRM_AdminPanel database
    const crmURI = 'mongodb+srv://krish1506soni_db_user:IwowMjDghFUAt5cZ@cluster0.qtppcus.mongodb.net/CRM_AdminPanel?retryWrites=true&w=majority&appName=Cluster0';
    
    console.log('📡 Connecting to CRM_AdminPanel database...');
    await mongoose.connect(crmURI);
    console.log('✅ Connected to CRM_AdminPanel database\n');
    
    // Get all users
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    
    if (users.length === 0) {
      console.log('📭 No users found in CRM_AdminPanel database.');
      await mongoose.disconnect();
      return;
    }
    
    console.log(`👥 Found ${users.length} user(s) in CRM_AdminPanel database:\n`);
    
    users.forEach((user, index) => {
      console.log(`🔸 User #${index + 1}:`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email || 'Not provided'}`);
      console.log(`   Phone: ${user.phoneNumber || 'Not provided'}`);
      console.log(`   Role: ${user.role.toUpperCase()}`);
      console.log(`   Status: ${user.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   Account Locked: ${user.accountLocked ? '🔒 Yes' : '🔓 No'}`);
      console.log(`   Login Count: ${user.loginCount}`);
      console.log(`   Department: ${user.metadata?.department || 'Not specified'}`);
      console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
      console.log(`   Last Updated: ${user.updatedAt.toLocaleDateString()}`);
      console.log('');
    });
    
    // Show summary
    const superAdmins = users.filter(u => u.role === 'superadmin').length;
    const regularUsers = users.filter(u => u.role === 'user').length;
    const activeUsers = users.filter(u => u.isActive).length;
    const lockedUsers = users.filter(u => u.accountLocked).length;
    
    console.log('📊 Summary:');
    console.log(`   Super Admins: ${superAdmins}`);
    console.log(`   Regular Users: ${regularUsers}`);
    console.log(`   Active Users: ${activeUsers}`);
    console.log(`   Locked Users: ${lockedUsers}`);
    
    console.log('\n🔐 Login Credentials:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. Username: "${user.username}" | Password: [check your records] | Role: ${user.role}`);
    });
    
  } catch (error) {
    console.error('\n❌ Error listing users:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from CRM_AdminPanel database');
  }
}

listCRMUsers();

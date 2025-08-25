'use client';

import { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  ClockIcon,
  UserIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  QuestionMarkCircleIcon,
  CurrencyDollarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useDarkMode } from '../../hooks/useDarkMode';

interface OrderLog {
  id: string;
  action: string;
  username: string;
  userRole: string;
  timestamp: string;
  success: boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  details: {
    oldValues?: any;
    newValues?: any;
    changeSummary?: string[];
    method?: string;
    endpoint?: string;
    ipAddress?: string;
    userAgent?: string;
    requestBody?: any;
    responseStatus?: number;
    errorMessage?: string;
    metadata?: any;
  };
  ipAddress?: string;
  userAgent?: string;
}

interface OrderLogsModalProps {
  orderId: string;
  orderNumber?: string;
  onClose: () => void;
}

export default function OrderLogsModal({ orderId, orderNumber, onClose }: OrderLogsModalProps) {
  const { isDarkMode, mounted } = useDarkMode();
  const [logs, setLogs] = useState<OrderLog[]>([]);
  const [loading, setLoading] = useState(true); // Start with true for immediate feedback
  const [error, setError] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [showColorLegend, setShowColorLegend] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    // Start loading immediately when modal opens
    fetchLogs(false);
    
    // Listen for manual refresh events
    const handleRefreshEvent = (event: CustomEvent) => {
      if (event.detail?.orderId === orderId) {
        fetchLogs(false);
      }
    };
    
    // Listen for real-time order updates
    const handleOrderUpdate = (event: CustomEvent) => {
      if (event.detail?.orderId === orderId) {
        setIsUpdating(true);
        // Immediate update for better UX
                 setTimeout(() => {
           fetchLogs(false).finally(() => {
             setIsUpdating(false);
           });
        }, 200); // Faster response
      }
    };
    
    window.addEventListener('refreshOrderLogs', handleRefreshEvent as EventListener);
    window.addEventListener('orderUpdated', handleOrderUpdate as EventListener);
    
    return () => {
      window.removeEventListener('refreshOrderLogs', handleRefreshEvent as EventListener);
      window.removeEventListener('orderUpdated', handleOrderUpdate as EventListener);
    };
  }, [orderId]);

  const fetchLogs = async (isRetry = false) => {
    // Prevent multiple simultaneous requests
    if (isFetching && !isRetry) {
      return;
    }
    
    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      setIsFetching(true);
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      controller = new AbortController();
      timeoutId = setTimeout(() => {
        if (controller) {
          controller.abort();
        }
      }, 5000); // Reduced timeout to 5 seconds for faster failure detection
      
      const response = await fetch(`/api/orders/${orderId}/logs`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (!response.ok) {
        if (response.status === 404) {
          setLogs([]); // Empty logs for 404
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data || []);
        setRetryCount(0); // Reset retry count on success
      } else {
        setError(data.message || 'Failed to fetch logs');
      }
    } catch (err) {
      // Clean up timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (err instanceof Error && err.name === 'AbortError') {
        // Don't retry if it's a manual abort (component unmounting)
        if (controller?.signal.aborted) {
          return;
        }
        
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        
        if (newRetryCount < 2) { // Reduced retry attempts
          // Auto-retry on timeout
          setTimeout(() => fetchLogs(true), 500); // Faster retry
          return;
        } else {
          setError('Request timed out. Please try again.');
        }
      } else {
        setError('An error occurred while fetching logs');
      }
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
      setIsFetching(false);
    }
  };

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'order_create':
        return <PlusIcon className="h-5 w-5 text-emerald-500" />;
      case 'order_update':
        return <PencilIcon className="h-5 w-5 text-blue-500" />;
      case 'order_delete':
        return <TrashIcon className="h-5 w-5 text-red-500" />;
      case 'order_status_change':
        return <CheckCircleIcon className="h-5 w-5 text-purple-500" />;
      case 'view':
        return <EyeIcon className="h-5 w-5 text-slate-500" />;
      case 'lab_add':
        return <PlusIcon className="h-5 w-5 text-cyan-500" />;
      case 'lab_update':
        return <PencilIcon className="h-5 w-5 text-teal-500" />;
      case 'lab_delete':
        return <TrashIcon className="h-5 w-5 text-orange-500" />;
      case 'item_add':
        return <PlusIcon className="h-5 w-5 text-lime-500" />;
      case 'item_remove':
        return <TrashIcon className="h-5 w-5 text-rose-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'order_create':
        return 'Order Created';
      case 'order_update':
        return 'Order Updated';
      case 'order_delete':
        return 'Order Deleted';
      case 'order_status_change':
        return 'Status Changed';
      case 'view':
        return 'Order Viewed';
      case 'lab_add':
        return 'Lab Added';
      case 'lab_update':
        return 'Lab Updated';
      case 'lab_delete':
        return 'Lab Deleted';
      case 'item_add':
        return 'Item Added';
      case 'item_remove':
        return 'Item Removed';
      default:
        return action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'order_create':
        return 'bg-emerald-200 border-emerald-400 text-emerald-950 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300';
      case 'order_update':
        return 'bg-blue-200 border-blue-400 text-blue-950 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300';
      case 'order_delete':
        return 'bg-red-200 border-red-400 text-red-950 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300';
      case 'order_status_change':
        return 'bg-purple-200 border-purple-400 text-purple-950 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300';
      case 'view':
        return 'bg-slate-200 border-slate-400 text-slate-950 dark:bg-slate-900/20 dark:border-slate-700 dark:text-slate-300';
      case 'lab_add':
        return 'bg-cyan-200 border-cyan-400 text-cyan-950 dark:bg-cyan-900/20 dark:border-cyan-700 dark:text-cyan-300';
      case 'lab_update':
        return 'bg-teal-200 border-teal-400 text-teal-950 dark:bg-teal-900/20 dark:border-teal-700 dark:text-teal-300';
      case 'lab_delete':
        return 'bg-orange-200 border-orange-400 text-orange-950 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300';
      case 'item_add':
        return 'bg-lime-200 border-lime-400 text-lime-950 dark:bg-lime-900/20 dark:border-lime-700 dark:text-lime-300';
      case 'item_remove':
        return 'bg-rose-200 border-rose-400 text-rose-950 dark:bg-rose-900/20 dark:border-rose-700 dark:text-rose-300';
      default:
        return 'bg-gray-200 border-gray-400 text-gray-950 dark:bg-gray-900/20 dark:border-gray-700 dark:text-gray-300';
    }
  };

  const getActionBorderColor = (action: string) => {
    switch (action) {
      case 'order_create':
        return isDarkMode ? 'border-emerald-700' : 'border-emerald-400';
      case 'order_update':
        return isDarkMode ? 'border-blue-700' : 'border-blue-400';
      case 'order_delete':
        return isDarkMode ? 'border-red-700' : 'border-red-400';
      case 'order_status_change':
        return isDarkMode ? 'border-purple-700' : 'border-purple-400';
      case 'view':
        return isDarkMode ? 'border-slate-700' : 'border-slate-400';
      case 'lab_add':
        return isDarkMode ? 'border-cyan-700' : 'border-cyan-400';
      case 'lab_update':
        return isDarkMode ? 'border-teal-700' : 'border-teal-400';
      case 'lab_delete':
        return isDarkMode ? 'border-orange-700' : 'border-orange-400';
      case 'item_add':
        return isDarkMode ? 'border-lime-700' : 'border-lime-400';
      case 'item_remove':
        return isDarkMode ? 'border-rose-700' : 'border-rose-400';
      default:
        return isDarkMode ? 'border-gray-700' : 'border-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return {
        date: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }),
        time: date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        relative: 'Today'
      };
    } else if (diffInHours < 168) { // 7 days
      return {
        date: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }),
        time: date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        relative: date.toLocaleDateString('en-US', { weekday: 'long' })
      };
    } else {
      return {
        date: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }),
        time: date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        relative: `${Math.floor(diffInHours / 24)} days ago`
      };
    }
  };



  const formatChanges = (details: any) => {
    if (!details) return null;

    // Priority 1: Use the changeSummary if available (this contains the detailed change info)
    if (details.changeSummary && Array.isArray(details.changeSummary)) {
      console.log('🔍 Using changeSummary for formatting:', details.changeSummary);
      return details.changeSummary;
    }

    // Priority 2: Check for itemChanges structure (new detailed format)
    if (details.oldValues?.itemChanges || details.newValues?.itemChanges) {
      const itemChanges = details.oldValues?.itemChanges || details.newValues?.itemChanges || [];
      const changes: string[] = [];
      
      console.log('🔍 Processing itemChanges in modal:', itemChanges);
      
      itemChanges.forEach((change: any) => {
        if (change.type === 'item_updated') {
          const fieldChanges: string[] = [];
          
          // Process each field change
          Object.keys(change.changes).forEach(field => {
            const fieldChange = change.changes[field];
            
            if (field === 'quality') {
              fieldChanges.push(`Quality: "${fieldChange.old}" → "${fieldChange.new}"`);
            } else if (field === 'quantity') {
              fieldChanges.push(`Quantity: ${fieldChange.old} → ${fieldChange.new}`);
            } else if (field === 'description') {
              fieldChanges.push(`Description: "${fieldChange.old || ''}" → "${fieldChange.new || ''}"`);
            } else if (field === 'weaverSupplierName') {
              fieldChanges.push(`Weaver: "${fieldChange.old || ''}" → "${fieldChange.new || ''}"`);
            } else if (field === 'purchaseRate') {
              fieldChanges.push(`Rate: ₹${Number(fieldChange.old || 0).toFixed(2)} → ₹${Number(fieldChange.new || 0).toFixed(2)}`);
            } else if (field === 'imageUrls') {
              if (fieldChange.addedCount !== undefined) {
                if (fieldChange.addedCount > 0 && fieldChange.removedCount > 0) {
                  fieldChanges.push(`Images: Added ${fieldChange.addedCount} image(s), Removed ${fieldChange.removedCount} image(s)`);
                } else if (fieldChange.addedCount > 0) {
                  fieldChanges.push(`Images: Added ${fieldChange.addedCount} image(s)`);
                } else if (fieldChange.removedCount > 0) {
                  fieldChanges.push(`Images: Removed ${fieldChange.removedCount} image(s)`);
                }
              } else {
                const oldCount = (fieldChange.old || []).length;
                const newCount = (fieldChange.new || []).length;
                fieldChanges.push(`Images: ${oldCount} → ${newCount} image(s)`);
              }
            }
          });
          
          if (fieldChanges.length > 0) {
            changes.push(`✏️ Item ${change.index + 1}: ${fieldChanges.join(', ')}`);
          }
        } else if (change.type === 'item_added') {
          const details = [];
          if (change.item?.quality) {
            details.push(`Quality: "${change.item.quality}"`);
          }
          if (change.item?.quantity) {
            details.push(`Quantity: ${change.item.quantity}`);
          }
          if (change.item?.description) {
            details.push(`Description: "${change.item.description}"`);
          }
          if (change.item?.weaverSupplierName) {
            details.push(`Weaver: "${change.item.weaverSupplierName}"`);
          }
          if (change.item?.purchaseRate) {
            details.push(`Rate: ₹${Number(change.item.purchaseRate).toFixed(2)}`);
          }
          if (change.item?.imageUrls && change.item.imageUrls.length > 0) {
            details.push(`${change.item.imageUrls.length} image(s)`);
          }
          
          const itemSummary = `📦 Item ${change.index + 1}: Added new item${details.length > 0 ? ` (${details.join(', ')})` : ''}`;
          changes.push(itemSummary);
        } else if (change.type === 'item_removed') {
          changes.push(`🗑️ Item ${change.index + 1}: Removed item`);
        }
      });
      
      if (changes.length > 0) {
        return changes;
      }
    }



    // Priority 3: Fallback to old format
    if (details.oldValues && details.newValues) {
      const changes: string[] = [];
      
      console.log('🔍 Formatting changes for:', details.oldValues, details.newValues);
      
      // Only check fields that are actually present in oldValues (meaning they were changed)
      Object.keys(details.oldValues).forEach(field => {
        const oldVal = details.oldValues[field];
        const newVal = details.newValues[field];
        
        // Skip if values are the same
        if (oldVal === newVal) {
          console.log('🔍 Skipping field', field, 'because values are the same:', oldVal);
          return;
        }
        
        let oldDisplay = oldVal || 'Not set';
        let newDisplay = newVal || 'Not set';
        
        // Format dates for better readability
        if (field === 'arrivalDate' || field === 'poDate' || field === 'deliveryDate') {
          if (oldVal && oldVal !== 'Not set') {
            try {
              oldDisplay = new Date(oldVal).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            } catch (e) {
              oldDisplay = oldVal;
            }
          }
          if (newVal && newVal !== 'Not set') {
            try {
              newDisplay = new Date(newVal).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            } catch (e) {
              newDisplay = newVal;
            }
          }
        }
        
        // Handle party field specially (show name instead of ID)
        if (field === 'party') {
          if (oldVal && typeof oldVal === 'object' && oldVal.name) {
            oldDisplay = oldVal.name;
          } else if (oldVal && typeof oldVal === 'string') {
            oldDisplay = oldVal; // Keep as is if it's already a string
          }
          if (newVal && typeof newVal === 'object' && newVal.name) {
            newDisplay = newVal.name;
          } else if (newVal && typeof newVal === 'string') {
            newDisplay = newVal; // Keep as is if it's already a string
          }
        }
        
        console.log('🔍 Adding change for field:', field, 'from', oldDisplay, 'to', newDisplay);
        changes.push(`${getFieldDisplayName(field)}: "${oldDisplay}" → "${newDisplay}"`);
      });

      // Check for item changes
      if (details.oldValues.items && details.newValues.items) {
        const oldItems = details.oldValues.items || [];
        const newItems = details.newValues.items || [];
        
        if (oldItems.length !== newItems.length) {
          changes.push(`Items: ${oldItems.length} → ${newItems.length} items`);
        }
        
        // Check for specific item changes
        newItems.forEach((newItem: any, index: number) => {
          const oldItem = oldItems[index];
          if (oldItem) {
            if (oldItem.quantity !== newItem.quantity) {
              changes.push(`Item ${index + 1} Quantity: ${oldItem.quantity} → ${newItem.quantity}`);
            }
            if (oldItem.description !== newItem.description) {
              changes.push(`Item ${index + 1} Description: "${oldItem.description || 'Not set'}" → "${newItem.description || 'Not set'}"`);
            }
          }
        });
      }

      return changes;
    }

    // Handle other types of changes
    if (details.metadata) {
      const changes: string[] = [];
      
      if (details.metadata.labAdded) {
        changes.push(`Lab Data Added: ${details.metadata.labAdded}`);
      }
      if (details.metadata.labUpdated) {
        changes.push(`Lab Data Updated: ${details.metadata.labUpdated}`);
      }
      if (details.metadata.imageUploaded) {
        changes.push(`Image Uploaded: ${details.metadata.imageUploaded}`);
      }
      if (details.metadata.statusChanged) {
        changes.push(`Status Changed: ${details.metadata.statusChanged}`);
      }
      
      return changes.length > 0 ? changes : null;
    }

    return null;
  };

  const getFieldDisplayName = (field: string) => {
    const fieldMap: { [key: string]: string } = {
      orderType: 'Order Type',
      arrivalDate: 'Arrival Date',
      contactName: 'Contact Name',
      contactPhone: 'Contact Phone',
      poNumber: 'PO Number',
      styleNo: 'Style Number',
      weaverSupplierName: 'Weaver / Supplier Name',
              purchaseRate: 'Purchase Rate',
      poDate: 'PO Date',
      deliveryDate: 'Delivery Date',
      status: 'Status',
      // Item field names
      quality: 'Quality',
      quantity: 'Quantity',
      description: 'Description',
      imageUrls: 'Images'
    };
    return fieldMap[field] || field;
  };

  // Helper function to format log values for display
  const formatLogValue = (value: any, field?: string): string => {
    if (value === null || value === undefined) return 'Not set';
    if (typeof value === 'string') {
      // Handle quality field - if it looks like an ObjectId, show as "Unknown Quality"
      if (field === 'quality' && value.match(/^[0-9a-fA-F]{24}$/)) {
        return 'Unknown Quality';
      }
      return value.trim() || 'Empty';
    }
    if (typeof value === 'number') {
      // Format purchase rate as currency
      if (field === 'purchaseRate') {
        return `₹${Number(value).toFixed(2)}`;
      }
      return value.toString();
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return 'None';
      return `${value.length} item(s)`;
    }
    if (value && typeof value === 'object') {
      // Handle quality objects with name property
      if (value.name) {
        return value.name;
      }
      // Handle objects with _id
      if (value._id) {
        return value.name || value._id.toString();
      }
    }
    return String(value);
  };

  const getFieldIcon = (field: string) => {
    const iconMap: { [key: string]: any } = {
      orderType: <DocumentTextIcon className="h-4 w-4" />,
      arrivalDate: <CalendarIcon className="h-4 w-4" />,
      contactName: <UserIcon className="h-4 w-4" />,
      contactPhone: <ComputerDesktopIcon className="h-4 w-4" />,
      poNumber: <DocumentTextIcon className="h-4 w-4" />,
      styleNo: <DocumentTextIcon className="h-4 w-4" />,
      weaverSupplierName: <BuildingOfficeIcon className="h-4 w-4" />,
      purchaseRate: <CurrencyDollarIcon className="h-4 w-4" />,
      poDate: <CalendarIcon className="h-4 w-4" />,
      deliveryDate: <CalendarIcon className="h-4 w-4" />,
      status: <CheckCircleIcon className="h-4 w-4" />,
      // Item field icons
      quality: <DocumentTextIcon className="h-4 w-4" />,
      quantity: <DocumentTextIcon className="h-4 w-4" />,
      description: <DocumentTextIcon className="h-4 w-4" />,
      weaver: <BuildingOfficeIcon className="h-4 w-4" />,
      rate: <CurrencyDollarIcon className="h-4 w-4" />,
      images: <DocumentTextIcon className="h-4 w-4" />
    };
    return iconMap[field] || <DocumentTextIcon className="h-4 w-4" />;
  };

  const parseChange = (change: string) => {
    // Handle different change formats
    if (change.includes('→')) {
      const [fieldPart, changePart] = change.split(':');
      const fieldName = fieldPart.trim();
      const [oldValue, newValue] = changePart.split('→').map(v => v.trim().replace(/"/g, ''));
      
      // Extract the actual field name for formatting
      const fieldKey = fieldName.toLowerCase().replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '');
      
      return { 
        fieldName, 
        oldValue: formatLogValue(oldValue, fieldKey), 
        newValue: formatLogValue(newValue, fieldKey), 
        type: 'field-change' 
      };
    } else if (change.includes('Added item')) {
      return { fieldName: 'Item Added', oldValue: '', newValue: change, type: 'item-added' };
    } else if (change.includes('Removed item')) {
      return { fieldName: 'Item Removed', oldValue: change, newValue: '', type: 'item-removed' };
    } else if (change.includes('image')) {
      return { fieldName: 'Image', oldValue: '', newValue: change, type: 'image' };
    } else {
      return { fieldName: 'Field', oldValue: '', newValue: change, type: 'general' };
    }
  };

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`relative w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl ${
        isDarkMode ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-200'
      }`}>
        {/* Enhanced Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${
              isDarkMode ? 'bg-blue-600/20' : 'bg-blue-100'
            }`}>
              <DocumentTextIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div>
                             <h2 className="text-2xl font-bold">Order Activity Log</h2>
               {orderNumber && (
                 <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                   📋 Order #{orderNumber} • {logs.length} activities tracked
                   {isUpdating && (
                     <span className={`ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                       isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                     }`}>
                       <ArrowPathIcon className="h-3 w-3 animate-spin" />
                       Updating...
                     </span>
                   )}
                 </p>
               )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
                                                   {/* Manual refresh button */}
                           <button
                 onClick={(e) => {
                   e.preventDefault();
                   if (!isFetching) {
                     fetchLogs(false);
                   }
                 }}
                 disabled={isFetching}
                 className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 ${
                   isDarkMode 
                     ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                     : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                 } ${isFetching ? 'opacity-50 cursor-not-allowed' : ''}`}
                 title={isFetching ? "Refreshing..." : "Refresh logs"}
               >
                 <ArrowPathIcon className={`h-6 w-6 ${(loading || isFetching) ? 'animate-spin' : ''}`} />
               </button>
             

            
            <button
              onClick={() => setShowColorLegend(!showColorLegend)}
              className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
              title="Color Legend"
            >
              <QuestionMarkCircleIcon className="h-6 w-6" />
            </button>
            <button
              onClick={onClose}
              className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Color Legend */}
        {showColorLegend && (
          <div className={`border-b ${isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'}`}>
            <div className="p-4">
              <h3 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                <span className="mr-2">🎨</span>
                Color Legend
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Order Actions */}
                <div className="space-y-2">
                  <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Order Actions</h4>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded bg-emerald-200 border border-emerald-400"></div>
                      <span className="text-xs">Order Created</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded bg-blue-200 border border-blue-400"></div>
                      <span className="text-xs">Order Updated</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded bg-red-200 border border-red-400"></div>
                      <span className="text-xs">Order Deleted</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded bg-purple-200 border border-purple-400"></div>
                      <span className="text-xs">Status Changed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded bg-slate-200 border border-slate-400"></div>
                      <span className="text-xs">Order Viewed</span>
                    </div>
                  </div>
                </div>

                {/* Lab Actions */}
                <div className="space-y-2">
                  <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Lab Actions</h4>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded bg-cyan-200 border border-cyan-400"></div>
                      <span className="text-xs">Lab Added</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded bg-teal-200 border border-teal-400"></div>
                      <span className="text-xs">Lab Updated</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded bg-orange-200 border border-orange-400"></div>
                      <span className="text-xs">Lab Deleted</span>
                    </div>
                  </div>
                </div>

                {/* Item Actions */}
                <div className="space-y-2">
                  <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Item Actions</h4>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded bg-lime-200 border border-lime-400"></div>
                      <span className="text-xs">Item Added</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded bg-rose-200 border border-rose-400"></div>
                      <span className="text-xs">Item Removed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content with Custom Scrollbar */}
        <div className="overflow-y-auto max-h-[calc(92vh-120px)] custom-scrollbar">
          <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: ${isDarkMode ? '#374151' : '#f3f4f6'};
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: ${isDarkMode ? '#3b82f6' : '#60a5fa'};
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: ${isDarkMode ? '#2563eb' : '#3b82f6'};
            }
          `}</style>
          
                     {loading ? (
             <div className="space-y-4 p-6">
               {/* Enhanced Loading skeleton that matches actual log structure */}
               {[...Array(6)].map((_, index) => (
                 <div key={index} className={`animate-pulse rounded-xl border-2 shadow-lg ${
                   isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
                 }`}>
                   {/* Log Header Skeleton */}
                   <div className="p-6">
                     <div className="flex items-start justify-between">
                       <div className="flex items-start space-x-4 flex-1">
                         {/* Action Icon Skeleton */}
                         <div className={`p-3 rounded-xl ${
                           isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                         }`}>
                           <div className={`w-5 h-5 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded`}></div>
                         </div>
                         
                         {/* Main Content Skeleton */}
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center space-x-3 mb-2">
                             {/* Action Title Skeleton */}
                             <div className={`h-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-32`}></div>
                             {/* Status Badge Skeleton */}
                             <div className={`h-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-16`}></div>
                             {/* Changes Badge Skeleton */}
                             <div className={`h-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-20`}></div>
                           </div>
                           
                           {/* User and Time Info Skeleton */}
                           <div className="flex items-center space-x-6 text-sm">
                             <div className="flex items-center space-x-2">
                               <div className={`w-4 h-4 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded`}></div>
                               <div className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-24`}></div>
                               <div className={`h-5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-16`}></div>
                             </div>
                             
                             <div className="flex items-center space-x-2">
                               <div className={`w-4 h-4 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded`}></div>
                               <div className="flex flex-col space-y-1">
                                 <div className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-28`}></div>
                                 <div className={`h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-32`}></div>
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>
                       
                       {/* Expand Button Skeleton */}
                       <div className={`p-2 rounded-lg ${
                         isDarkMode ? 'bg-gray-700/50' : 'bg-gray-200'
                       }`}>
                         <div className={`w-5 h-5 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded`}></div>
                       </div>
                     </div>
                   </div>
                   
                   {/* Changes Section Skeleton (sometimes visible) */}
                   {index % 2 === 0 && (
                     <div className={`border-t ${
                       isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-100'
                     }`}>
                       <div className="p-6">
                         <div className={`h-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-40 mb-4`}></div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {[...Array(2)].map((_, changeIndex) => (
                             <div key={changeIndex} className={`p-4 rounded-lg border ${
                               isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-white'
                             }`}>
                               <div className="flex items-start space-x-3">
                                 <div className={`p-2 rounded-lg ${
                                   isDarkMode ? 'bg-gray-700/50' : 'bg-gray-200'
                                 }`}>
                                   <div className={`w-4 h-4 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded`}></div>
                                 </div>
                                 <div className="flex-1 space-y-2">
                                   <div className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-24`}></div>
                                   <div className={`h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded`}></div>
                                   <div className={`h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded`}></div>
                                 </div>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               ))}
               
               {/* Loading indicator */}
               <div className="text-center py-6">
                 <div className="flex items-center justify-center space-x-2">
                   <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                   <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                     Loading activity logs...
                   </span>
                 </div>
               </div>
             </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className={`p-4 rounded-full inline-flex items-center justify-center ${
                isDarkMode ? 'bg-red-600/20' : 'bg-red-100'
              }`}>
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-base font-semibold mt-3 text-red-600">Failed to Load Logs</h3>
              <p className="text-red-500 mb-4 mt-1 text-sm">{error}</p>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  fetchLogs(false);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                🔄 Retry
              </button>
            </div>
                     ) : logs.length === 0 ? (
             <div className="p-8 text-center">
               <div className={`p-4 rounded-full inline-flex items-center justify-center ${
                 isDarkMode ? 'bg-gray-600/20' : 'bg-gray-100'
               }`}>
                 <InformationCircleIcon className="h-8 w-8 text-gray-400" />
               </div>
               <h3 className={`text-base font-semibold mt-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                 No Activity Found
               </h3>
               <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                 This order hasn't been modified yet. Activity will appear here when changes are made.
               </p>
               <div className="mt-4">
                 <button
                                       onClick={(e) => {
                      e.preventDefault();
                      fetchLogs(false);
                    }}
                   className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 ${
                     isDarkMode 
                       ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                       : 'bg-blue-500 hover:bg-blue-600 text-white'
                   }`}
                 >
                   🔄 Refresh
                 </button>
               </div>
             </div>
          ) : (
            <div className="p-6 space-y-4">
              {logs.map((log, index) => {
                const isExpanded = expandedLogs.has(log.id);
                const changes = formatChanges(log.details);
                const hasChanges = changes && changes.length > 0;
                const timestamp = formatTimestamp(log.timestamp);
                
                return (
                  <div
                    key={log.id}
                    className={`rounded-xl border-2 shadow-lg transition-all duration-300 hover:shadow-xl ${
                      isDarkMode 
                        ? `bg-gray-800/50 hover:bg-gray-800/70 ${getActionColor(log.action).replace('bg-', 'border-').replace('text-', '').replace('dark:bg-', 'dark:border-').replace('dark:text-', '')}` 
                        : `bg-white hover:bg-gray-50 ${getActionColor(log.action).replace('bg-', 'border-').replace('text-', '')}`
                    }`}
                  >
                    {/* Enhanced Log Header */}
                                         <div 
                       className={`p-6 cursor-pointer transition-all duration-300 ${
                         hasChanges ? 'hover:bg-gray-200 dark:hover:bg-gray-700/50' : ''
                       }`}
                       onClick={() => hasChanges && toggleLogExpansion(log.id)}
                     >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          {/* Action Icon */}
                          <div className={`p-3 rounded-xl ${
                            isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                          }`}>
                            {getActionIcon(log.action)}
                          </div>
                          
                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className={`text-lg font-semibold ${
                                isDarkMode ? 'text-gray-200' : 'text-gray-900'
                              }`}>{getActionLabel(log.action)}</h3>
                                                             <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getActionColor(log.action)}`}>
                                 {log.success ? 'Success' : 'Failed'}
                               </span>
                              {hasChanges && (
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-200 text-blue-800'
                                }`}>
                                  {changes.length} change{changes.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            
                            {/* User and Time Info */}
                            <div className="flex items-center space-x-6 text-sm">
                              <div className="flex items-center space-x-2">
                                <UserIcon className="h-4 w-4 text-gray-500" />
                                <span className={`font-semibold ${
                                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                  {log.username}
                                </span>
                                {log.userRole && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-700'
                                  }`}>
                                    {log.userRole}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <CalendarIcon className="h-4 w-4 text-gray-500" />
                                <div className="flex flex-col">
                                  <span className={`font-semibold ${
                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                  }`}>
                                    {timestamp.date}
                                  </span>
                                  <span className={`text-xs ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    {timestamp.time} • {timestamp.relative}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expand/Collapse Button */}
                        {hasChanges && (
                          <div className={`p-2 rounded-lg transition-all duration-300 ${
                            isExpanded 
                              ? 'bg-blue-200 dark:bg-blue-900/30' 
                              : 'bg-gray-200 dark:bg-gray-700/50'
                          }`}>
                            <ChevronRightIcon className={`h-5 w-5 transition-transform duration-300 ${
                              isExpanded ? 'rotate-90' : ''
                            } ${isExpanded ? 'text-blue-700' : 'text-gray-500'}`} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enhanced Expandable Changes Section with Grid */}
                    {hasChanges && isExpanded && (
                      <div className={`border-t ${
                        isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-100'
                      }`}>
                        <div className="p-6">
                          <h4 className={`text-lg font-semibold mb-4 flex items-center ${
                            isDarkMode ? 'text-blue-400' : 'text-blue-700'
                          }`}>
                            <span className="mr-2">📝</span>
                            Changes Made
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {changes.map((change: string, changeIndex: number) => {
                              const parsedChange = parseChange(change);
                              
                              return (
                                <div key={changeIndex} className={`p-4 rounded-lg border ${
                                  isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-white'
                                }`}>
                                  <div className="flex items-start space-x-3">
                                    <div className={`p-2 rounded-lg ${
                                      isDarkMode ? 'bg-gray-700/50' : 'bg-gray-200'
                                    }`}>
                                      {getFieldIcon(parsedChange.fieldName.toLowerCase().replace(/\s+/g, ''))}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className={`font-semibold text-sm mb-2 ${
                                        isDarkMode ? 'text-gray-200' : 'text-gray-900'
                                      }`}>
                                        {parsedChange.fieldName}
                                      </div>
                                      
                                      {parsedChange.type === 'field-change' ? (
                                        <div className="space-y-2">
                                          <div className={`p-2 rounded text-xs ${
                                            isDarkMode ? 'bg-red-900/20 border border-red-600' : 'bg-red-100 border border-red-300'
                                          }`}>
                                            <div className={`font-semibold mb-1 ${
                                              isDarkMode ? 'text-red-300' : 'text-red-700'
                                            }`}>Before:</div>
                                            <div className={`break-words ${
                                              isDarkMode ? 'text-gray-200' : 'text-gray-900'
                                            }`}>
                                              {parsedChange.oldValue}
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-center">
                                            <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                                          </div>
                                          <div className={`p-2 rounded text-xs ${
                                            isDarkMode ? 'bg-green-900/20 border border-green-600' : 'bg-green-100 border border-green-300'
                                          }`}>
                                            <div className={`font-semibold mb-1 ${
                                              isDarkMode ? 'text-green-300' : 'text-green-700'
                                            }`}>After:</div>
                                            <div className={`break-words ${
                                              isDarkMode ? 'text-gray-200' : 'text-gray-900'
                                            }`}>
                                              {parsedChange.newValue}
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className={`p-2 rounded text-xs ${
                                          parsedChange.type === 'item-added' 
                                            ? (isDarkMode ? 'bg-green-900/20 border border-green-600' : 'bg-green-100 border border-green-300')
                                            : parsedChange.type === 'item-removed'
                                            ? (isDarkMode ? 'bg-red-900/20 border border-red-600' : 'bg-red-100 border border-red-300')
                                            : (isDarkMode ? 'bg-blue-900/20 border border-blue-600' : 'bg-blue-100 border border-blue-300')
                                        }`}>
                                          <div className={`font-semibold mb-1 ${
                                            parsedChange.type === 'item-added'
                                              ? (isDarkMode ? 'text-green-300' : 'text-green-700')
                                              : parsedChange.type === 'item-removed'
                                              ? (isDarkMode ? 'text-red-300' : 'text-red-700')
                                              : (isDarkMode ? 'text-blue-300' : 'text-blue-700')
                                          }`}>
                                            {parsedChange.type === 'item-added' ? 'Added:' : 
                                             parsedChange.type === 'item-removed' ? 'Removed:' : 'Change:'}
                                          </div>
                                          <div className={`break-words ${
                                            isDarkMode ? 'text-gray-200' : 'text-gray-900'
                                          }`}>
                                            {parsedChange.newValue || parsedChange.oldValue}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

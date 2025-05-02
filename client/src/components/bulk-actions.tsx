import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Download, Trash, ClipboardCopy, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

type BulkActionOption = {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  adminOnly?: boolean;
};

interface BulkActionsProps<T> {
  selectedItems: T[];
  allItems: T[];
  setSelectedItems: React.Dispatch<React.SetStateAction<T[]>>;
  getItemId: (item: T) => number | string;
  onDelete?: (ids: (number | string)[]) => Promise<void>;
  onExport?: (items: T[]) => void;
  additionalActions?: BulkActionOption[];
  isUserAdmin?: boolean;
}

export function BulkActions<T>({
  selectedItems,
  allItems,
  setSelectedItems,
  getItemId,
  onDelete,
  onExport = defaultExport,
  additionalActions = [],
  isUserAdmin = false,
}: BulkActionsProps<T>) {
  const { toast } = useToast();
  const selectedCount = selectedItems.length;
  const allSelected = selectedItems.length === allItems.length && allItems.length > 0;
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Toggle select all items
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...allItems]);
    }
  };

  // Open confirmation dialog for delete
  const openDeleteConfirmation = () => {
    if (!onDelete) return;
    
    if (selectedCount === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to delete.",
        variant: "destructive",
      });
      return;
    }

    setConfirmDialogOpen(true);
  };

  // Handle confirmed bulk delete
  const handleDelete = async () => {
    if (!onDelete) return;
    
    const ids = selectedItems.map(item => getItemId(item));
    try {
      await onDelete(ids);
      toast({
        title: "Items deleted",
        description: `Successfully deleted ${selectedCount} item${selectedCount !== 1 ? 's' : ''}.`,
      });
      setSelectedItems([]);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete selected items",
        variant: "destructive",
      });
    } finally {
      setConfirmDialogOpen(false);
    }
  };

  // Handle export functionality
  const handleExport = () => {
    if (selectedCount === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to export.",
        variant: "destructive",
      });
      return;
    }
    
    onExport(selectedItems);
  };

  // Filter admin-only actions if user is not admin
  const filteredActions = additionalActions.filter(action => 
    !action.adminOnly || isUserAdmin
  );

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center mr-2">
          <Checkbox 
            id="select-all" 
            checked={allSelected} 
            onCheckedChange={toggleSelectAll}
            aria-label="Select all items"
          />
          <label htmlFor="select-all" className="ml-2 text-sm text-muted-foreground">
            {selectedCount > 0 
              ? `${selectedCount} selected` 
              : "Select all"}
          </label>
        </div>

        {selectedCount > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {onDelete && (
                <DropdownMenuItem onClick={openDeleteConfirmation}>
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </DropdownMenuItem>
              
              {filteredActions.length > 0 && <DropdownMenuSeparator />}
              
              {filteredActions.map((action, index) => (
                <DropdownMenuItem key={index} onClick={action.action}>
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCount} {selectedCount === 1 ? 'item' : 'items'}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-3">
            <AlertTriangle className="h-16 w-16 text-amber-500" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Yes, Delete {selectedCount} {selectedCount === 1 ? 'Item' : 'Items'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Default export function that creates a CSV from selected items
function defaultExport<T>(items: T[]) {
  if (items.length === 0) return;

  // Get headers from the first item
  const headers = Object.keys(items[0] as any);
  
  // Convert items to CSV format
  const csvContent = [
    headers.join(','),
    ...items.map(item => 
      headers.map(header => 
        JSON.stringify((item as any)[header] ?? '')
      ).join(',')
    )
  ].join('\n');
  
  // Create a blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `export-${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
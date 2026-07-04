import { useState, useEffect } from "react";
import { useDebounce } from "@/src/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, Search, X, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Vendor {
  id: string;
  code?: string;
  name: string;
  category?: string;
  city?: string;
  state?: string;
  isActive: boolean;
  _count?: {
    expenses: number;
  };
}

interface VendorAutocompleteProps {
  value?: Vendor | null;
  onChange: (vendor: Vendor | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowInactive?: boolean;
  className?: string;
  onVendorCreate?: (name: string) => Promise<Vendor>;
}

export function VendorAutocomplete({
  value,
  onChange,
  placeholder = "Search vendors...",
  disabled = false,
  allowInactive = false,
  className,
  onVendorCreate,
}: VendorAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setVendors([]);
      return;
    }

    const fetchVendors = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/vendors?search=${encodeURIComponent(debouncedSearch)}&isActive=true`,
          { headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setVendors(allowInactive ? data : data.filter((v: Vendor) => v.isActive));
        }
      } catch (error) {
        console.error("Error fetching vendors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [debouncedSearch, allowInactive]);

  const handleSelectVendor = (vendor: Vendor) => {
    onChange(vendor);
    setSearch("");
    setVendors([]);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < vendors.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectVendor(vendors[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handleCreateVendor = async () => {
    if (!onVendorCreate || !search.trim()) return;

    try {
      const newVendor = await onVendorCreate(search.trim());
      handleSelectVendor(newVendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-10"
          />
          {value && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={handleClear}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        {value && (
          <Badge variant="secondary" className="whitespace-nowrap">
            <Building2 className="w-3 h-3 mr-1" />
            {value.name}
          </Badge>
        )}
      </div>

      {open && (search.length >= 2 || loading) && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger className="hidden" />
          <PopoverContent
            className="w-full p-0"
            align="start"
            initialFocus={false}
          >
            <ScrollArea className="max-h-60">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              ) : vendors.length > 0 ? (
                <div className="p-2">
                  {vendors.map((vendor, index) => (
                    <button
                      key={vendor.id}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                        index === selectedIndex && "bg-gray-100 dark:bg-gray-800"
                      )}
                      onClick={() => handleSelectVendor(vendor)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{vendor.name}</span>
                            {vendor.code && (
                              <Badge variant="outline" className="text-xs">
                                {vendor.code}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            {vendor.category && (
                              <span>{vendor.category}</span>
                            )}
                            {(vendor.city || vendor.state) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {[vendor.city, vendor.state].filter(Boolean).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                        <Check className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-gray-500">
                  {search.length < 2 ? (
                    "Type at least 2 characters to search"
                  ) : (
                    <div className="space-y-2">
                      <p>No vendors found</p>
                      {onVendorCreate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCreateVendor}
                          className="mt-2"
                        >
                          Create "{search}" as new vendor
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

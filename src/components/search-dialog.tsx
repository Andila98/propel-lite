
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Building2, Users, Loader2 } from "lucide-react";
import type { Property, Tenant } from "@/lib/types";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<{ properties: Property[], tenants: Tenant[] } | null>(null);

  React.useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${query}`);
        if (!response.ok) throw new Error("Search failed");
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounce);
  }, [query]);
  
  const runCommand = React.useCallback((command: () => unknown) => {
    onOpenChange(false)
    command()
  }, [onOpenChange])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search for properties, tenants..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && <div className="p-4 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}

        {!loading && !results && query.length > 1 && (
            <CommandEmpty>No results found.</CommandEmpty>
        )}
        
        {results?.properties && results.properties.length > 0 && (
          <CommandGroup heading="Properties">
            {results.properties.map((property) => (
              <CommandItem
                key={property.id}
                onSelect={() => runCommand(() => router.push(`/properties/${property.id}`))}
              >
                <Building2 className="mr-2 h-4 w-4" />
                <span>{property.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results?.tenants && results.tenants.length > 0 && (
          <CommandGroup heading="Tenants">
            {results.tenants.map((tenant) => (
              <CommandItem
                key={tenant.id}
                onSelect={() => runCommand(() => router.push(`/tenants/${tenant.id}`))}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>{tenant.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
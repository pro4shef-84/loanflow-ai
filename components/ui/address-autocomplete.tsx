"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

export interface AddressSuggestion {
  display: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface AddressAutocompleteProps {
  value?: string;
  placeholder?: string;
  onAddressSelect: (suggestion: AddressSuggestion) => void;
  onChange?: (value: string) => void;
  className?: string;
  id?: string;
}

export function AddressAutocomplete({
  value = "",
  placeholder = "Start typing an address...",
  onAddressSelect,
  onChange,
  className,
  id,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => { setQuery(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 4) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/address/autocomplete?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setSuggestions(json.data ?? []);
      setOpen((json.data ?? []).length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange?.(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const handleSelect = (s: AddressSuggestion) => {
    setQuery(s.street);
    onChange?.(s.street);
    setSuggestions([]);
    setOpen(false);
    onAddressSelect(s);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-start gap-2 border-b last:border-0"
              onMouseDown={() => handleSelect(s)}
            >
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{s.street}</p>
                <p className="text-xs text-muted-foreground">{s.city}, {s.state} {s.zip}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

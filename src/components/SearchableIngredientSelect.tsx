import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { Ingredient } from '../types';

interface SearchableIngredientSelectProps {
  ingredients: Ingredient[];
  value: string;
  onChange: (ingredientId: string) => void;
  placeholder?: string;
  required?: boolean;
  isError?: boolean;
  id?: string;
}

export function SearchableIngredientSelect({
  ingredients,
  value,
  onChange,
  placeholder = 'Select or search ingredient...',
  required = false,
  isError = false,
  id,
}: SearchableIngredientSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedIngredient = ingredients.find(
    (i) => i.ingredient_id === value || String((i as any).id) === value
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filtered = ingredients.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = item.name.toLowerCase().includes(q);
    const teluguMatch = item.name_telugu ? item.name_telugu.toLowerCase().includes(q) : false;
    const catMatch = item.category ? item.category.toLowerCase().includes(q) : false;
    return nameMatch || teluguMatch || catMatch;
  });

  const handleSelect = (ingId: string) => {
    onChange(ingId);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required={required}
          value={value}
          onChange={() => {}}
          className="opacity-0 absolute inset-0 pointer-events-none h-full w-full"
        />
      )}

      {/* Button to open dropdown */}
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-sm bg-white border rounded-sm text-left transition-all flex items-center justify-between gap-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#193d2c] ${
          isError
            ? 'border-[#942426]/50 bg-[#faeaea]/20'
            : isOpen
            ? 'border-[#193d2c] ring-1 ring-[#193d2c]'
            : 'border-[#e5e0d5] hover:border-[#193d2c]'
        }`}
      >
        <div className="flex-1 min-w-0">
          {selectedIngredient ? (
            <div className="flex items-baseline flex-wrap gap-x-1.5 truncate">
              <span className="font-semibold text-[#131715]">{selectedIngredient.name}</span>
              {selectedIngredient.name_telugu && (
                <span className="text-xs text-[#59635e]">
                  ({selectedIngredient.name_telugu})
                </span>
              )}
              <span className="text-xs text-[#8b948f] font-mono-fig">
                · {selectedIngredient.current_stock} {selectedIngredient.unit}
              </span>
            </div>
          ) : (
            <span className="text-[#8b948f]">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-[#8b948f]">
          {selectedIngredient && (
            <span
              onClick={handleClear}
              className="p-0.5 hover:text-[#942426] hover:bg-[#faeaea] rounded-xs transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#193d2c]' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown with search bar */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[#e5e0d5] rounded-sm shadow-xl overflow-hidden max-h-72 flex flex-col animate-in fade-in zoom-in-95 duration-100">
          {/* Search bar input */}
          <div className="p-2 border-b border-[#e5e0d5] bg-[#fbfaf7] sticky top-0 z-10 flex items-center gap-2">
            <Search size={15} className="text-[#59635e] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filtered.length > 0) {
                    handleSelect(filtered[0].ingredient_id);
                  }
                }
              }}
              placeholder="Search by English or Telugu name..."
              className="w-full text-xs bg-transparent border-0 text-[#131715] placeholder-[#8b948f] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#8b948f] hover:text-[#131715] p-0.5 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filtered ingredient list */}
          <div className="overflow-y-auto max-h-56 divide-y divide-[#f0ece3] custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-[#59635e]">
                No ingredients found matching <span className="font-semibold text-[#131715]">"{searchQuery}"</span>
              </div>
            ) : (
              filtered.map((item) => {
                const isSelected = item.ingredient_id === value;
                return (
                  <button
                    key={item.ingredient_id}
                    type="button"
                    onClick={() => handleSelect(item.ingredient_id)}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-[#e6f0ea] text-[#193d2c] font-medium'
                        : 'hover:bg-[#193d2c]/5 text-[#131715]'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline flex-wrap gap-x-1.5">
                        <span className="font-semibold text-sm text-[#131715]">{item.name}</span>
                        {item.name_telugu && (
                          <span className="text-xs text-[#59635e]">({item.name_telugu})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#59635e]">
                        <span className="capitalize">{item.category}</span>
                        <span>&middot;</span>
                        <span className="font-mono-fig">
                          Stock: {item.current_stock} {item.unit}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={16} className="text-[#193d2c] shrink-0 font-bold" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

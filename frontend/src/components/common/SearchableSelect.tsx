import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Option {
    value: string | number;
    label: string;
    subLabel?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | number | undefined;
    onChange: (value: string | number) => void;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    className?: string;
    error?: string;
    required?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = '選択してください',
    label,
    disabled = false,
    className = '',
    error,
    required = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [displayOptions, setDisplayOptions] = useState<Option[]>(options);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        setDisplayOptions(
            options.filter(opt =>
                opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (opt.subLabel && opt.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
            )
        );
    }, [searchTerm, options]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val: string | number) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <div
                className={`
          relative w-full bg-white border border-gray-300 rounded-lg shadow-sm pl-3 pr-10 py-2 text-left cursor-default 
          focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'}
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
        `}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`block truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </span>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    <div className="sticky top-0 z-10 bg-white px-2 py-2 border-b border-gray-100">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                placeholder="検索..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    </div>

                    {displayOptions.length === 0 ? (
                        <div className="cursor-default select-none relative py-2 px-4 text-gray-700">
                            見つかりませんでした
                        </div>
                    ) : (
                        displayOptions.map((option) => (
                            <div
                                key={option.value}
                                className={`
                  cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-orange-50 transition-colors
                  ${value === option.value ? 'bg-orange-50 text-orange-900 font-medium' : 'text-gray-900'}
                `}
                                onClick={() => handleSelect(option.value)}
                            >
                                <div className="flex flex-col">
                                    <span className="block truncate">{option.label}</span>
                                    {option.subLabel && (
                                        <span className="text-xs text-gray-500">{option.subLabel}</span>
                                    )}
                                </div>

                                {value === option.value && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-orange-600">
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
};

export default SearchableSelect;

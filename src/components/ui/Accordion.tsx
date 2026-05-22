'use client';

import { FC, useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

export const Accordion: FC<AccordionProps> = ({ items, className = '' }) => {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className={`divide-y divide-gray-200 ${className}`}>
      {items.map((item) => {
        const isOpen = openId === item.id;

        return (
          <div key={item.id}>
            <button
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-gray-700 hover:text-gray-900"
              aria-expanded={isOpen}
            >
              {item.title}
              <ChevronDown
                size={16}
                className={`transition-transform duration-normal ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && (
              <div className="pb-3 text-sm text-gray-600">{item.content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

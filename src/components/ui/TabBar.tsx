import React, { useEffect, useRef } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  scrollable?: boolean; // Enable horizontal scrolling for many tabs
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  scrollable = tabs.length > 5 // Auto-enable scrollable if more than 5 tabs
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (scrollable && activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeButton = activeTabRef.current;

      const containerWidth = container.offsetWidth;
      const buttonLeft = activeButton.offsetLeft;
      const buttonWidth = activeButton.offsetWidth;

      // Center the active tab
      const scrollPosition = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
      container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [activeTab, scrollable]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-area-pb">
      <div
        ref={scrollContainerRef}
        className={`flex ${scrollable ? 'overflow-x-auto scrollbar-hide' : 'justify-evenly'}`}
        style={scrollable ? { scrollSnapType: 'x mandatory' } : undefined}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => onTabChange(tab.id)}
              className={`
                ${scrollable ? 'flex-shrink-0 px-4' : 'flex-1'}
                flex flex-col items-center py-2 min-h-[56px] min-w-[72px]
                transition-colors duration-200
                ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}
              `}
              style={scrollable ? { scrollSnapAlign: 'center' } : undefined}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="w-6 h-6">{tab.icon}</div>
              <span className="text-xs mt-1 font-medium whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

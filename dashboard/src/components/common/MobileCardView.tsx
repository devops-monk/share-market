import { ReactNode } from 'react';

interface MobileCardViewProps<T> {
  items: T[];
  renderCard: (item: T, index: number) => ReactNode;
  renderTable: () => ReactNode;
}

export default function MobileCardView<T>({ items, renderCard, renderTable }: MobileCardViewProps<T>) {
  return (
    <>
      {/* Cards on mobile */}
      <div className="md:hidden space-y-3">
        {items.map((item, i) => (
          <div key={i}>{renderCard(item, i)}</div>
        ))}
      </div>
      {/* Table on desktop */}
      <div className="hidden md:block">
        {renderTable()}
      </div>
    </>
  );
}

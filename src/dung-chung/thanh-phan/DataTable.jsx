import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Pagination from './Pagination';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';
import './DataTable.css';

export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  loading = false,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  pageSize = 10,
  initialSortField = '',
  initialSortDirection = 'asc',
  onRowClick,
  className = '',
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState(initialSortField);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  if (loading) {
    return (
      <div className={`table-container ${className}`}>
        <LoadingState />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className={`table-container ${className}`}>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => {
                const isSorted = sortField === col.field;
                const canSort = col.sortable;

                return (
                  <th
                    key={col.key || col.field || col.title}
                    style={{ width: col.width, textAlign: col.align || 'left' }}
                    className={canSort ? 'sortable' : ''}
                    onClick={canSort ? () => handleSort(col.field) : undefined}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                      }}
                    >
                      <span>{col.title}</span>
                      {canSort && (
                        <span style={{ opacity: isSorted ? 1 : 0.4 }}>
                          {isSorted ? (
                            sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                          ) : (
                            <ArrowUpDown size={14} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr
                key={row[keyField] || index}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key || col.field || col.title}
                    style={{ textAlign: col.align || 'left' }}
                  >
                    {col.render ? col.render(row[col.field], row, index) : row[col.field] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedData.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}


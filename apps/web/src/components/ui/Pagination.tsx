import { FiChevronLeft, FiChevronRight } from '../../icons';

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200">
      <p className="text-sm text-gray-600">
        Menampilkan <span className="font-medium">{start}</span>–<span className="font-medium">{end}</span> dari{' '}
        <span className="font-medium">{total}</span> data
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-ghost px-2 py-1.5"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
        >
          <FiChevronLeft className="w-4 h-4" />
          Sebelumnya
        </button>
        <span className="px-3 text-sm text-gray-700">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn-ghost px-2 py-1.5"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Halaman berikutnya"
        >
          Berikutnya
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

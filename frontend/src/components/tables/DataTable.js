import StatusBadge from '../common/StatusBadge';
import '../../styles/data-table.css';

function DataTable({ columns, rows, caption, onRowClick, emptyMessage = 'No records found.' }) {
  return (
    <div className="table-shell">
      {caption ? <p className="table-caption">{caption}</p> : null}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} style={column.width ? { width: column.width } : undefined}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr>
                <td colSpan={columns.length} className="table-empty-cell">
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
            {rows.map((row, rowIndex) => (
              <tr
                key={row.id || row.patientId || row.visitNo || row.invoiceNo || row.prescriptionNo || rowIndex}
                className={onRowClick ? 'table-row-clickable' : ''}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => {
                  const rawValue = row[column.key];

                  if (column.render) {
                    return <td key={column.key}>{column.render(rawValue, row)}</td>;
                  }

                  if (column.badge) {
                    return (
                      <td key={column.key}>
                        <StatusBadge value={rawValue} />
                      </td>
                    );
                  }

                  return <td key={column.key}>{rawValue}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;

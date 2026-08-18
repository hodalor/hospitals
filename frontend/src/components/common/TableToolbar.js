function TableToolbar({ searchValue, onSearchChange, searchPlaceholder, filters = [] }) {
  return (
    <div className="table-toolbar">
      <input
        className="table-search"
        type="search"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
      />

      {filters.map((filter) => (
        filter.type === 'date' ? (
          <input
            key={filter.label}
            className="table-filter"
            type="date"
            value={filter.value}
            onChange={(event) => filter.onChange(event.target.value)}
            min={filter.min}
            max={filter.max}
            aria-label={filter.label}
          />
        ) : (
          <select
            key={filter.label}
            className="table-filter"
            value={filter.value}
            onChange={(event) => filter.onChange(event.target.value)}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      ))}
    </div>
  );
}

export default TableToolbar;

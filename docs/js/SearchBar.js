const SearchBar = (props) => {
  const [focused, setFocused] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const stations = stationMap.allStations;

  React.useEffect(() => {}, [stations]);

  const handleSearch = (t) => {
    const input = t.toUpperCase();
    let res = stations.filter((s) => {
      if (s.name.startsWith(input)) {
        return true;
      }
      return false;
    });
    const filtered = res.slice(0, 5);
    // console.log("FILTERED", filtered);
    setResults(filtered);
    // console.log("LENGTH", res.slice(0, 5).length);
  };
  return (
    <div
      className={`${"search-container"} ${focused ? "larger-container" : null}`}
    >
      <input
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        type="text"
        placeholder="Search Stations"
        className="search-input"
        onChange={({ target }) => handleSearch(target.value)}
      />
      <div
        className={`results-container ${
          results.length > 0 && focused ? "" : "zero-height"
        }`}
      >
        {results.map((r) => (
          <SearchItem station={r} key={r.id} />
        ))}
      </div>
    </div>
  );
};

const SearchItem = ({ station }) => {
  const { name, selected } = station;
  return (
    <div className="search-item" onClick={() => toggleStation(station)}>
      <p>{name}</p>
      <p>{selected ? "✅" : ""}</p>
    </div>
  );
};

ReactDOM.render(
  React.createElement(SearchBar),
  document.querySelector("#search-div")
);

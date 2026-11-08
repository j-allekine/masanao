(() => {
  const positionKey = "masanaoHistoryPosition";
  const { history } = window;
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  let state = history.state;
  let position = state?.[positionKey] ?? 0;

  function stamp(data, nextPosition) {
    return { ...data, [positionKey]: nextPosition };
  }

  replace(stamp(state, position), "");
  state = history.state;

  history.pushState = (data, unused, url) => {
    push(stamp(data, position + 1), unused, url);
    position += 1;
    state = history.state;
  };

  history.replaceState = (data, unused, url) => {
    replace(stamp(data, position), unused, url);
    state = history.state;
  };

  // Register before the router so a dirty editor can stop route restoration.
  window.addEventListener("popstate", (event) => {
    const destination = event.state?.[positionKey];
    if (typeof destination !== "number") {
      // A native fragment link adds a same-document entry with no state.
      position += 1;
      replace(stamp(state, position), "");
      state = history.state;
      return;
    }

    position = destination;
    state = event.state;
    const traversal = new CustomEvent("masanao:editor-traversal", {
      cancelable: true,
      detail: position,
    });
    if (!window.dispatchEvent(traversal)) event.stopImmediatePropagation();
  }, true);
})();

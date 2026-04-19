const UI_SETTINGS = {
  ui_logo_url: "/img/logo.webm",
  ui_color_primary: "#6d28d9",
  ui_color_secondary: "#16a34a"
};

migrate((app) => {
  const upsertByData = (collectionName, fieldName, value, data) => {
    const collection = app.findCollectionByNameOrId(collectionName);
    let record;

    try {
      record = app.findFirstRecordByData(collectionName, fieldName, value);
    } catch (_) {
      record = new Record(collection);
    }

    Object.keys(data).forEach((key) => {
      record.set(key, data[key]);
    });

    app.save(record);
  };

  Object.keys(UI_SETTINGS).forEach((key) => {
    upsertByData("settings", "key", key, {
      key,
      value: UI_SETTINGS[key]
    });
  });
}, (app) => {
  Object.keys(UI_SETTINGS).forEach((key) => {
    try {
      app.delete(app.findFirstRecordByData("settings", "key", key));
    } catch (_) {
      // Already absent.
    }
  });
});

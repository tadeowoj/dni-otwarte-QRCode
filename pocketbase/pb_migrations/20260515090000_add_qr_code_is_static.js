migrate((app) => {
  const collection = app.findCollectionByNameOrId("qr_codes");
  collection.fields.add(new BoolField({ name: "is_static" }));
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("qr_codes");
  collection.fields.removeByName("is_static");
  app.save(collection);
});

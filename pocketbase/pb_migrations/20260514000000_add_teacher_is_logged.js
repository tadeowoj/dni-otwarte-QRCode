migrate((app) => {
  const collection = app.findCollectionByNameOrId("teachers");
  collection.fields.add(new BoolField({ name: "is_logged" }));
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("teachers");
  collection.fields.removeByName("is_logged");
  app.save(collection);
});

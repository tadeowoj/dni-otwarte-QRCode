migrate((app) => {
  const collection = app.findCollectionByNameOrId("participants");
  collection.fields.add(new BoolField({ name: "in_draw" }));
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("participants");
  collection.fields.removeByName("in_draw");
  app.save(collection);
});

migrate((app) => {
  const collection = app.findCollectionByNameOrId("participants");
  collection.fields.add({ name: "in_draw", type: "bool" });
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("participants");
  const field = collection.fields.getByName("in_draw");
  if (field) {
    collection.fields.removeById(field.getId());
    app.save(collection);
  }
});

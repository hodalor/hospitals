const { getActiveTenantContext, getMasterConnection } = require('../../config/db');

function getModelForConnection(connection, modelName, schema) {
  if (connection.models[modelName]) {
    return connection.model(modelName);
  }

  return connection.model(modelName, schema);
}

function createScopedModel(modelName, schema, options = {}) {
  const { masterOnly = false } = options;

  return new Proxy(
    {},
    {
      get(_target, property) {
        if (property === 'schema') {
          return schema;
        }

        if (property === 'modelName') {
          return modelName;
        }

        if (property === 'getModel') {
          return () => {
            const activeContext = getActiveTenantContext();
            const connection = masterOnly
              ? getMasterConnection()
              : activeContext.connection || getMasterConnection();
            return getModelForConnection(connection, modelName, schema);
          };
        }

        const activeContext = getActiveTenantContext();
        const connection = masterOnly
          ? getMasterConnection()
          : activeContext.connection || getMasterConnection();
        const model = getModelForConnection(connection, modelName, schema);
        const value = model[property];

        return typeof value === 'function' ? value.bind(model) : value;
      },
    }
  );
}

module.exports = {
  createScopedModel,
  getModelForConnection,
};

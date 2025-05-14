import deliveryRoutes from './deliveryRoutes'
const routes = (app) => {
    app.use("/delivery", deliveryRoutes);
    
  };
  export { routes };
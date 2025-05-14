const getOrderDetails = async(orderId) => {
    return {
      orderId,
      customerId: 'some-customer-id', 
      restaurantId: 'some-restaurant-id',
      items: [],
      status: 'preparing'
    };
  }
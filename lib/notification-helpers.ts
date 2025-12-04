import { notificationApi } from '@/lib/notification-api';
import { NotificationType, NotificationPriority } from '@/types/notification';

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  priority: NotificationPriority = NotificationPriority.NORMAL,
  metadata?: any
) => {
  try {
    return await notificationApi.createNotification({
      userId,
      title,
      message,
      type,
      priority,
      metadata
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};


export const createOrderUpdateNotification = async (
  userId: string,
  orderStatus: string,
  orderId: string
) => {
  const statusMessages = {
    'pending': 'Your order has been received and is being processed.',
    'confirmed': 'Your order has been confirmed and will be prepared for shipping.',
    'processing': 'Your order is currently being processed.',
    'shipped': 'Great news! Your order has been shipped and is on its way.',
    'delivered': 'Your order has been successfully delivered.',
    'cancelled': 'Your order has been cancelled.'
  };

  const priorities = {
    'pending': NotificationPriority.NORMAL,
    'confirmed': NotificationPriority.NORMAL,
    'processing': NotificationPriority.NORMAL,
    'shipped': NotificationPriority.HIGH,
    'delivered': NotificationPriority.HIGH,
    'cancelled': NotificationPriority.URGENT
  };

  return createNotification(
    userId,
    `Order ${orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}`,
    statusMessages[orderStatus as keyof typeof statusMessages] || 'Your order status has been updated.',
    NotificationType.ORDER_UPDATE,
    priorities[orderStatus as keyof typeof priorities] || NotificationPriority.NORMAL,
    { orderId, status: orderStatus }
  );
};

export const createPaymentNotification = async (
  userId: string,
  paymentStatus: 'success' | 'failed' | 'pending',
  amount: number,
  orderId: string
) => {
  const statusMessages = {
    'success': `Payment of $${amount.toFixed(2)} has been successfully processed.`,
    'failed': `Payment of $${amount.toFixed(2)} has failed. Please try again.`,
    'pending': `Payment of $${amount.toFixed(2)} is being processed.`
  };

  const priorities = {
    'success': NotificationPriority.HIGH,
    'failed': NotificationPriority.URGENT,
    'pending': NotificationPriority.NORMAL
  };

  return createNotification(
    userId,
    `Payment ${paymentStatus === 'success' ? 'Successful' : paymentStatus === 'failed' ? 'Failed' : 'Processing'}`,
    statusMessages[paymentStatus],
    NotificationType.PAYMENT_STATUS,
    priorities[paymentStatus],
    { orderId, amount, paymentStatus }
  );
};

export const createPromotionNotification = async (
  userId: string,
  title: string,
  message: string,
  promoCode?: string,
  discount?: number
) => {
  return createNotification(
    userId,
    title,
    message,
    NotificationType.PROMOTION,
    NotificationPriority.NORMAL,
    { promoCode, discount }
  );
};

export const createSystemAlertNotification = async (
  userId: string,
  title: string,
  message: string,
  priority: NotificationPriority = NotificationPriority.HIGH
) => {
  return createNotification(
    userId,
    title,
    message,
    NotificationType.SYSTEM_ALERT,
    priority
  );
};

export const createBulkNotifications = async (
  userIds: string[],
  title: string,
  message: string,
  type: NotificationType,
  priority: NotificationPriority = NotificationPriority.NORMAL,
  metadata?: any
) => {
  const promises = userIds.map(userId => 
    createNotification(userId, title, message, type, priority, metadata)
  );
  
  try {
    return await Promise.allSettled(promises);
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
};
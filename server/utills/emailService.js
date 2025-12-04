const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendOrderNotificationEmail(orderData, recipientEmail) {
    const mailOptions = {
        from: `"UTM-Shop" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `🛒 Ваш заказ #${orderData.id} успешно оформлен!`,
        html: `
      <h2>Спасибо за ваш заказ!</h2>
      <p>Здравствуйте, ${orderData.name} ${orderData.lastname}!</p>
      <p>Ваш заказ успешно оформлен и находится в статусе: <b>${orderData.status}</b></p>
      <p><strong>Сумма:</strong> $${orderData.total}</p>
      <p><strong>Дата:</strong> ${orderData.dateTime}</p>
      <hr>
      <p>Мы свяжемся с вами по телефону <b>${orderData.phone}</b> для уточнения деталей.</p>
      <p>Если у вас есть вопросы — просто ответьте на это письмо.</p>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📩 Email уведомление отправлено на ${recipientEmail}`);
    } catch (error) {
        console.error("❌ Ошибка при отправке email уведомления:", error);
    }
}


module.exports = { sendOrderNotificationEmail };

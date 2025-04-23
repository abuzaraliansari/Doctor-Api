// const twilio = require('twilio');
// const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

// const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// const sendOTP = async (mobileNumber, otp) => {
//   try {
//     // Ensure the phone number is in E.164 format
//     const formattedNumber = `+${mobileNumber}`;
//     const message = await client.messages.create({
//       body: `Your OTP code is ${otp}`,
//       from: TWILIO_PHONE_NUMBER,
//       to: formattedNumber
//     });
//     console.log(`OTP ${otp} sent to ${formattedNumber}`);
//     return true;
//   } catch (error) {
//     console.error('Error sending OTP:', error);
//     throw new Error('Failed to send OTP');
//   }
// };

// module.exports = {
//   sendOTP,
// };
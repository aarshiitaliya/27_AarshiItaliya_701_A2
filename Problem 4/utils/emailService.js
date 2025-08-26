const nodemailer = require('nodemailer');

// Email configuration
const emailConfig = {
    service: 'gmail', // You can change this to your preferred service
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com', // Replace with your email
        pass: process.env.EMAIL_PASS || 'your-app-password'     // Replace with your app password
    }
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Function to send welcome email to new employee
const sendWelcomeEmail = async (employee, plainPassword) => {
    try {
        const mailOptions = {
            from: emailConfig.auth.user,
            to: employee.email,
            subject: 'Welcome to Our Company - Your Account Details',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Welcome to Our Company!</h1>
                    </div>
                    
                    <div style="padding: 30px; background: #f8f9fa;">
                        <h2 style="color: #333;">Dear ${employee.fullName},</h2>
                        
                        <p style="color: #666; line-height: 1.6;">
                            Welcome to our team! We're excited to have you join us. Below are your account details 
                            for accessing the employee portal:
                        </p>
                        
                        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #667eea;">
                            <h3 style="color: #333; margin-top: 0;">Your Account Details:</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #333;">Employee ID:</td>
                                    <td style="padding: 8px 0; color: #666;">${employee.empId}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #333;">Email:</td>
                                    <td style="padding: 8px 0; color: #666;">${employee.email}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #333;">Temporary Password:</td>
                                    <td style="padding: 8px 0; color: #e74c3c; font-family: monospace; background: #f8f9fa; padding: 4px 8px; border-radius: 4px;">${plainPassword}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #333;">Department:</td>
                                    <td style="padding: 8px 0; color: #666;">${employee.department}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #333;">Position:</td>
                                    <td style="padding: 8px 0; color: #666;">${employee.position}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #333;">Joining Date:</td>
                                    <td style="padding: 8px 0; color: #666;">${new Date(employee.joiningDate).toLocaleDateString()}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
                            <h4 style="color: #856404; margin-top: 0;">⚠️ Important Security Notice:</h4>
                            <p style="color: #856404; margin-bottom: 0;">
                                Please change your password immediately after your first login for security purposes.
                                Keep your login credentials confidential and never share them with anyone.
                            </p>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #333; margin-top: 0;">Salary Information:</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #333;">Base Salary:</td>
                                    <td style="padding: 8px 0; color: #666;">₹${employee.baseSalary.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #333;">Gross Salary:</td>
                                    <td style="padding: 8px 0; color: #28a745; font-weight: bold;">₹${employee.grossSalary.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #333;">Net Salary:</td>
                                    <td style="padding: 8px 0; color: #28a745; font-weight: bold;">₹${employee.netSalary.toLocaleString()}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <p style="color: #666; line-height: 1.6;">
                            If you have any questions or need assistance, please don't hesitate to contact the HR department.
                        </p>
                        
                        <p style="color: #666; line-height: 1.6;">
                            Best regards,<br>
                            <strong>HR Team</strong><br>
                            Company Name
                        </p>
                    </div>
                    
                    <div style="background: #333; padding: 15px; text-align: center;">
                        <p style="color: #999; margin: 0; font-size: 12px;">
                            This is an automated email. Please do not reply to this message.
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return { success: false, error: error.message };
    }
};

// Function to send employee update notification
const sendUpdateNotification = async (employee, updatedFields) => {
    try {
        const mailOptions = {
            from: emailConfig.auth.user,
            to: employee.email,
            subject: 'Account Information Updated',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #28a745, #20c997); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Account Updated</h1>
                    </div>
                    
                    <div style="padding: 30px; background: #f8f9fa;">
                        <h2 style="color: #333;">Dear ${employee.fullName},</h2>
                        
                        <p style="color: #666; line-height: 1.6;">
                            Your account information has been updated by the HR department. 
                            Here are the details of the changes:
                        </p>
                        
                        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #28a745;">
                            <h3 style="color: #333; margin-top: 0;">Updated Fields:</h3>
                            <ul style="color: #666; line-height: 1.8;">
                                ${updatedFields.map(field => `<li><strong>${field}</strong></li>`).join('')}
                            </ul>
                        </div>
                        
                        <p style="color: #666; line-height: 1.6;">
                            If you have any questions about these changes, please contact the HR department.
                        </p>
                        
                        <p style="color: #666; line-height: 1.6;">
                            Best regards,<br>
                            <strong>HR Team</strong>
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Update notification sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Error sending update notification:', error);
        return { success: false, error: error.message };
    }
};

// Test email configuration
const testEmailConfig = async () => {
    try {
        await transporter.verify();
        console.log('Email configuration is valid');
        return true;
    } catch (error) {
        console.error('Email configuration error:', error.message);
        return false;
    }
};

module.exports = {
    sendWelcomeEmail,
    sendUpdateNotification,
    testEmailConfig
};

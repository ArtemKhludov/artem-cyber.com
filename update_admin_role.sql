-- Update user role to admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@energylogic.com';


How to verify:
1. Check admin panel:
Login as admin: 
admin@energylogic.com
admin123
The admin panel should have a red "Logout" button in the top right corner
Click "Logout" - should redirect to login page
2. Check user dashboard:
Login as user: 
user@test.com
user123
The dashboard should have a red "Logout" button in the top right corner
Click "Logout" - should redirect to login page

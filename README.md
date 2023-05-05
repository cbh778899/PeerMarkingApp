# Peer Marking App
This application is designed for RMIT COSC1235 Peer-to-Peer Networks (2301).  
Application deployed on [Render](https://lililele-peer-marking-app.onrender.com).
# Setup and Run
The `requirements.txt` is specifically used for deploy on [Render](https://render.com).  
If want to run local machine, please remove `Gunicorn` from [requirements.txt](/requirements.txt#2), uncomment [the last 2 lines in app.py](/app.py#139), and run command  

> pip3 install -r requirements.txt  
> python3 app.py  

This will run this app on `port 8000` in debug mode, and use your machine as host in local network.
# How to Use
An administrator should go to `Admin Options` and create a new session follow instructions, this will automatically take the administrator to `Management Panel`.  
In the `Management Panel`, the administrator can find the session ID, which can be used for peers to mark others.  
Administrator can also see marks of each peer in percentage, add/rename group/peers, see logs of peer marking, save marks in svg or export the session for restore when creating a new session. (All data will be reset with the application starts, so save the session if you need).  
Administrators can also mark peers, the mark will be 50%-50% if common peers also done their marks. As soon as administrators logged in to a session or created a new session, they can see the `Marking Panel` option on main menu.  
Administrators can switch between groups for peers to mark through `Management Panel`, selecting an option from `Change Group for Marking` section, this will automatically update, and administrators should ask peers to manually click `refresh` on the top of their `Marking Panel`.  
**_Don't forget to save session if you still need the results!_**
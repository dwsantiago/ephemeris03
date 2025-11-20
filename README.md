
Swiss Ephemeris API - Ready for Render / Docker
==============================================

Contents:
- index.js        (Express server)
- package.json
- Dockerfile
- /ephe           (place the .se1 ephemeris files here; some may already be included)

How to deploy on Render (quick):
1) Create a GitHub repo and push this project (all files).
2) On Render, create a new Web Service, connect GitHub repo.
3) Build Command: npm install
4) Start Command: node index.js
5) Set environment variable EPHE_PATH if you want to override the default path.

Notes:
- This project requires Swiss Ephemeris data files (.se1). They must be placed in ./ephe or the path set by EPHE_PATH.
- The API exposes:
   GET /positions?date=ISO&lat=&lon=
   GET /houses?date=ISO&lat=&lon&system=W|P|E
   GET /raw?date=ISO&lat=&lon&system=W
   GET /temperament?date=ISO&lat=&lon

- Example:
  http://your-app.onrender.com/temperament?date=1997-10-31T12:35:00Z&lat=-18.2&lon=-45.0


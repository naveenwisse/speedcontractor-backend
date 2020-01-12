# JobIntroduce API #

## Project Description

NodeJS API for the JobIntroduce application.

## Commands

### NPM

  * `npm install` -- Install project NPM dependencies. This is automatically done when you first create the project. You should only need to run this if you add dependencies in `package.json`.
  * `npm update` -- Update project NPM dependencies.

### Grunt

  * `grunt` -- Default grunt command to run the server.
  * `grunt server` -- Start the server, same as the default command

## Usage

Create a .env file for db connection. ex:

```
DB_HOST=localhost
DB_PORT=28017
DB_NAME=jobintroduce
SECRET='the most secret secret of all secrets'
PORT=8080
BUCKET=job-introduce-profile-images-local
```

### Getting a Token

Send a `POST` request to `http://localhost:8080/api/authenticate` with test user parameters as `x-www-form-urlencoded`.

```
  {
    email: String,
    password: String
  }
```

### Verifying a Token and Listing Users

You can send the token as a URL parameter: `http://localhost:8080/api/profile?token=YOUR_TOKEN_HERE`

*Steps to deploy sc-api*

1) brew install heroku.

2) heroku login and login to your heroku account.

3) then add the two remote repos

    - git remote add stage https://git.heroku.com/jobintroduce-api-stage.git

        - then push the code to stage using:

        - git push stage

    - add the production remote: git remote add prod https://git.heroku.com/jobintroduce-api.git

        - push code to production using:

        - git push prod

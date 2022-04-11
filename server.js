const express = require('express')
const app = express()
const bodyParser = require('body-parser')

app.use(bodyParser.json())

app.get("/", (req, res, next) => {
    res.json({
        message: 'Hello World!'
    })
})

app.listen(4000)

import express from "express";
import cors from "cors";
import CONFIG from "./config";
import readMessage, { pop3_getPaginatedMails } from "./pop3";
import imapTroll from "./imap";
import imap_getPaginatedMails from "./imap";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: ["http://localhost:5173", "https://listel-api.tenco.waw.pl", "https://listel.tenco.waw.pl"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        exposedHeaders: ["Authorization"],
    })
);



app.get("/greet", (req, res) => {
    res.send(
        "<h1>Hello</h1>"
    )
})

app.get("/:protocol/receive/:pagination/:page/:order?", async (req, res) => {
    
    const protocol = req.params.protocol.toLowerCase();
    const pagination = parseInt(req.params.pagination);
    const page = parseInt(req.params.page);
    const order = req.params.order ?? undefined;



    if (isNaN(pagination) || isNaN(page)) {
        return res.status(400).send("Invalid pagination or page number");
    }

    if (protocol === "pop3") {

        res.send(await pop3_getPaginatedMails(pagination, page));
        return;
    }

    if (protocol === "imap") {

        res.send(await imap_getPaginatedMails(pagination, page));
        return;
    }

    res.status(422).send("Bad mail protocol")

})


app.listen(CONFIG.EXPRESS.PORT, () => {
    console.log(`[⚡] Server is listening on port: ${CONFIG.EXPRESS.PORT}!`);
});

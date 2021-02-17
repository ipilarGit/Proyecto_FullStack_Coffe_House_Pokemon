/* Proyecto: Coffe House Pokemon */

const express = require("express");
const app = express();
const exphbs = require("express-handlebars");
const Handlebars = require("handlebars");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const { v4: uuidv4 } = require("uuid");
const firebase = require("firebase");
const jwt = require("jsonwebtoken");
const axios = require("axios").default;
const fs = require("fs");
const path = require("path");
require("dotenv").config();

//Config Firebase Caffe House
var firebaseConfig = {
    apiKey: "AIzaSyDEiYugYBNZR7_25zUDLTQyGas11dZomlY",
    authDomain: "coffe-3d996.firebaseapp.com",
    databaseURL: "https://coffe-3d996-default-rtdb.firebaseio.com",
    projectId: "coffe-3d996",
    storageBucket: "coffe-3d996.appspot.com",
    messagingSenderId: "775325188971",
    appId: "1:775325188971:web:8019368d20773ac2d9022e"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// make auth and firestore references
const auth = firebase.auth();
const db = firebase.firestore();

// update firestore settings
db.settings({ timestampsInSnapshots: true });

/////////////

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
    fileUpload({
        limits: { fileSize: 5000000 },
        abortOnLimit: true,
        responseOnLimit: "Supero el límte de tamaño pra el archivo",
        helpers: {},
    })
);

const {
    getCategories,
    addProduct,
    getProducts,
    updateProduct,
    deleteProduct,
    adminLogin,
    addTransaction,
} = require("./consultas.js");

app.use("/assets", express.static(__dirname + "/assets"));
app.use("/css", express.static(__dirname + "/assets/css"));
app.use("/js", express.static(__dirname + "/assets/js"));

app.set("view engine", "handlebars");
app.engine(
    "handlebars",
    exphbs({
        layoutsDir: __dirname + "/views",
        partialsDir: __dirname + "/views/components/",
        defaultLayout: __dirname + "/views/layouts/main",
        /*  defaultLayout: __dirname + "/views/Inicio", */
    })
);

app.listen(3000);

Handlebars.registerHelper("formatDate", (fecha) => {
    let year = fecha.getFullYear();
    let mes = fecha.getMonth() + 1;
    let dia = fecha.getDate();
    return `${dia}/${mes}/${year}`;
});

Handlebars.registerHelper("ifCond", function(v1, v2, options) {
    console.log(v1, v2);
    if (v1 === v2) {
        return options.fn(this);
    }
});

// rutas
app.get("/", async(req, res) => {
    const { pag } = req.query;
    let productos;
    try {
        productos = await getProducts();
    } catch (e) {
        console.log(e);
    }
    const pageQ = Math.ceil(productos.length / 8);

    pag
        ?
        (productos = productos.slice(pag * 8 - 8, pag * 8)) :
        (productos = productos.slice(0, 8));
    res.render("Inicio", {
        title: "Coffe House Pokemon ",
        productos,
        pageQ,
        pag: pag || 1,
    });
});

app.get("/busqueda/:filtro/:input", async(req, res) => {
    let productos = await getProducts();
    let filtros = Object.keys(productos[0]);

    const { filtro, input } = req.params;
    let all_ProductsLabels = productos.map((p) => p.model);
    all_ProductsLabels = [...new Set(all_ProductsLabels)];

    if (filtro == "todos") {
        productos = productos.filter((p) => {
            let valoresDeBusqueda = Object.values(p).map((v) =>
                v.toString().toLocaleLowerCase()
            );
            return valoresDeBusqueda.includes(input.toLocaleLowerCase());
        });
    } else {
        productos = productos.filter((p) => {
            return p[filtro].toString().toLowerCase().includes(input.toLowerCase());
        });
    }

    res.render("Busqueda", {
        productos: productos.length >= 1 ? productos : null,
        all_ProductsLabels,
        filtros,
    });
});

app.get("/admin/productos", async(req, res) => {
    const { token } = req.query;

    jwt.verify(token, process.env.SECRET_KEY, async(err, decoded) => {
        if (!err) {
            const promiseOptions = await Promise.all([
                getProducts(),
                getCategories(),
            ]);
            const [productos, categories] = promiseOptions;
            productos.forEach((p) => {
                p.category = categories.find((c) => c.id == p.category).name;
            });

            res.render("Productos", {
                products: JSON.stringify(productos),
                productos,
                categoriesData: JSON.stringify(categories),
                categories,
            });
        } else {
            res.status(401).redirect("/");
        }
    });
});

app.post("/productos", async(req, res) => {
    let productos = req.body;
    try {
        productos = Object.values(productos);
        const result = await addProduct(productos);
        res.status(201).send(result);
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: "500 Internal Error", message: e.message });
    }
});

app.put("/productos/:id", async(req, res) => {
    const { id } = req.params;
    let productos = req.body;
    productos.id = id;
    try {
        productos = Object.values(productos);
        const result = await updateProduct(productos, id);
        fs.unlink(path.join(__dirname, `../${result[0].image}`), (err) => {
            err
                ?
                res.send("Lo siento, este archivo no existe en servidor") :
                res.status(201).send(result);
        });
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: "500 Internal Error", message: e.message });
    }
});

app.post("/files", (req, res) => {
    const { image } = req.files;
    console.log(image);
    const format = image.mimetype.split("/")[1];
    const path = `assets/images/${uuidv4().slice(30)}.${format}`;
    image.mv(path, (err) => {
        err ? res.status(500).send("Algo salio mal...") : res.send(path);
    });
});

app.get("/productos", async(req, res) => {
    try {
        const respuesta = await getProducts();
        res.send(respuesta);
    } catch (err) {
        res.status(500).send({ error: "500 Internal Error", message: e.message });
    }
});

app.delete("/productos/:id", async(req, res) => {
    const { id } = req.params;
    const respuesta = await deleteProduct(id);
    console.log(respuesta);
    console.log(path.join(__dirname, `./${respuesta[0].image}`));
    respuesta[1] > 0 ?
        fs.unlink(path.join(__dirname, `./${respuesta[0].image}`), (err) => {
            err
                ?
                res.send("/Lo siento, este archivo no existe en el servidor") :
                res.send(`Imagen ${id} fue eliminada con éxito`);
        }) :
        res.status(500).send({
            message: "No existe un registro con el id indicado",
            error: "Error 500.",
        });
});

app.get("/producto/:id", async(req, res) => {
    const { id } = req.params;
    const promiseOptions = await Promise.all([getProducts(), getCategories()]);
    const [productos, categories] = promiseOptions;
    productos.forEach((p) => {
        p.category = categories.find((c) => c.id == p.category).name;
    });
    let producto = productos.find((p) => p.id == id);
    res.render("Details", { producto, productoData: JSON.stringify(producto) });
});

app.get("/carrito", (req, res) => {
    res.render("Carrito");
});

app.get("/registro", (req, res) => {
    res.render("Registro");
});

let uid;
app.post("/registro", (req, res) => {
    const { email, nombre, password } = req.body;
    auth
        .createUserWithEmailAndPassword(email, password)
        .then(async(resultado) => {
            uid = resultado.user.uid;
            console.log(uid);
            verificar();
            await db
                .collection("users")
                .add({ email, nombre, password })
                .catch((e) => console.log(e));
            res.send(resultado.user);
        })
        .catch((e) => {
            res.status(500).send({
                message: "Usuario ya existe",
                error: "500 Internal Error",
            });
        });
});

function verificar() {
    var user = firebase.auth().currentUser;
    user
        .sendEmailVerification()
        .then(() => {
            console.log("Enviando correo..");
        })
        .catch((error) => {
            console.log(error);
        });
}

app.get("/logout", (req, res) => {
    res.render("Logout")

});

app.get("/logout", (req, res) => {

    auth
        .signOut()
        .then(() => {
            console.log("saliendo...");
            res.render("/");
        })
        .catch((error) => {
            console.log(error);
        });
})


const observador = () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in, see docs for a list of available properties
            // https://firebase.google.com/docs/reference/js/firebase.User
            console.log('Existe usuario activo')
            var displayName = user.displayName;
            var email = user.email;
            console.log(user)
            var emailVerified = user.emailVerified;
            var photoURL = user.photoURL;
            var uid = user.uid;
            // ...
        } else {
            // User is signed out
            console.log("No existe usuario activo");
        }
    });
}
observador();

app.get("/login", (req, res) => {
    res.render("Login");
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    auth
        .signInWithEmailAndPassword(email, password)
        .then(() => {
            db.collection("users")
                .where("email", "==", email)
                .get()
                .then((snapshot) => {
                    const user = [];
                    snapshot.forEach((doc) => {
                        user.push({ id: doc.id, data: doc.data() });
                    });
                    res.send(user[0]);
                });
        })
        .catch((e) => {
            res.status(500).send({
                message: "Usuario No existee",
                error: "500 Internal Error",
            });
        });
});


app.get("/admin", (req, res) => {
    res.render("Admin");
});

app.post("/admin", async(req, res) => {
    const { username, password } = req.body;

    console.log(username);
    console.log(password);
    try {
        const admin = await adminLogin([username, password]);
        console.log('admin', admin);
        if (admin) {
            jwt.sign({
                    data: admin,
                    exp: Math.floor(Date.now() / 1000) + 500,
                },
                process.env.SECRET_KEY,
                (err, jwt) => {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        console.log(jwt);
                        res.send(jwt);
                    }
                }
            );
        } else {
            res.send({
                error: "Usuario o clave incorrecta para Administrador",
                message: e.message,
            })
        }
    } catch (e) {
        res
            .status(500)
            .send({
                error: "Error 500 Internal Error",
                message: e.message,
            });
    }
});

app.post("/transaction", async(req, res) => {
    const { amount } = req.body;
    console.log(amount);
    await axios({
        url: "https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.0/transactions",
        headers: {
            "Content-type": "application/json",
            "Tbk-Api-Key-Id": "597055555532",
            "Tbk-Api-Key-Secret": "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C",
        },
        data: {
            buy_order: "ordenCompra12345678",
            session_id: "sesion1234557545",
            amount,
            return_url: "/success",
        },
        method: "POST",
    }).then((data) => {
        const { token } = data.data;
        console.log(token);
        res.send({ token });
    });
});

app.post("/success", (req, res) => {
    const { token_ws: token } = req.body;
    axios({
        url: "https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.0/transactions/" +
            token,
        headers: {
            "Content-type": "application/json",
            "Tbk-Api-Key-Id": "597055555532",
            "Tbk-Api-Key-Secret": "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C",
        },
        method: "PUT",
    }).then(async(data) => {
        const details = data.data;
        if (data.data.status !== "AUTHORIZED") {
            res.send("Algo salió mal en la compra...");
        } else {
            try {
                let {
                    buy_order: order_number,
                    transaction_date: date,
                    amount,
                    card_detail,
                    payment_type_code: payment_type,
                } = details;
                card_detail = card_detail.card_number;
                const trasnactionValues = [
                    order_number,
                    date,
                    amount,
                    card_detail,
                    payment_type,
                ];

                await addTransaction(trasnactionValues);
                res.redirect(`/`);
            } catch (e) {
                res
                    .status(500)
                    .send({ error: "500 internal error", message: e.message });
            }
        }
    });
});
const { Pool } = require("pg");

// CREATE DATABASE coffehousepokemon;
// CREATE TABLE productos(id SERIAL PRIMARY KEY, stock INT NOT NULL, price INT CHECK(price >= 0) NOT NULL, image varchar(255) NOT NULL, category INT NOT NULL, description VARCHAR(500) NOT NULL, created DATE);
// CREATE TABLE admin(id SERIAL PRIMARY KEY, username VARCHAR(20) NOT NULL, password VARCHAR(20) NOT NULL);
// CREATE TABLE transactions (id SERIAL PRIMARY KEY, order_number VARCHAR(100), date DATE, amount FLOAT, card_detail INT, payment_type VARCHAR(5)) ;
// CREATE TABLE categories (id SERIAL PRIMARY KEY, name VARCHAR(100)) ;


const pool = new Pool({
    user: "postgres",
    host: "localhost",
    password: "postgres",
    database: "coffehousepokemon",
    port: 5432,
});

/*
const pool = new Pool({
  user: "onpgiaogzxruck",
  host: "ec2-3-230-247-88.compute-1.amazonaws.com",
  password: "1c254b0e1733707364fef9cfccbdae3c7c754706f0c604ad01b8a14d731abefb",
  database: "d4tbk9v94g0mjc",
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});
 */

const getCategories = async() => {
    const result = await pool.query("SELECT * FROM categories");
    return result.rows;
};

const addProduct = async(values) => {

    const result = await pool.query(
        "INSERT INTO productos (stock, price, image, category, description, created) values ($1,$2,$3,$4,$5, NOW()) RETURNING *",
        values
    );
    console.log(result.rows[0]);
    return result.rows;
};

const updateProduct = async(values, id) => {
    console.log(values);
    const urlImage = await pool.query("SELECT image FROM productos WHERE id =$1", [id]);
    const result = await pool.query(
        "UPDATE productos SET stock = $1, price = $2, image = $3, category = $4, description = $5, created = NOW() WHERE id = $6 RETURNING *",
        values
    );
    console.log(result.rows[0]);
    return [urlImage.rows[0], result.rows];
};

const getProducts = async() => {
    const result = await pool.query("SELECT * FROM productos");
    return result.rows;
};

const deleteProduct = async(id) => {
    console.log(id);
    const urlImage = await pool.query("SELECT image FROM productos WHERE id =$1", [id]);
    const result = await pool.query("DELETE FROM productos WHERE id = $1", [id]);
    return ([urlImage.rows[0], result.rowCount]);
};

const adminLogin = async(values) => {
    const result = await pool.query(
        "SELECT * from admin WHERE username = $1 AND password = $2",
        values
    );
    return result.rows[0];
};

const addTransaction = async(values) => {
    const result = await pool.query(
        "INSERT INTO transactions (order_number, date, amount, card_detail, payment_type) values ($1,$2,$3,$4,$5) RETURNING *",
        values
    );
    console.log(result.rows[0]);
    return result.rows;
};


module.exports = {
    getCategories,
    addProduct,
    getProducts,
    updateProduct,
    deleteProduct,
    adminLogin,
    addTransaction,
};
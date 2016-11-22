from flask import Flask, flash, redirect, render_template, request, session, url_for, send_from_directory, jsonify
import pg, os, random, string, bcrypt, uuid

db = pg.DB(
    dbname="superstore_db")

db.debug = True


app = Flask("superstore", static_url_path="")

@app.route('/')
def home():
    return app.send_static_file('index.html')

@app.route('/api/products', methods=["GET"])
def get_products():
    product_list = db.query('select * from product').dictresult()
    return jsonify(product_list)

@app.route('/api/product/<id>', methods=["GET"])
def get_productID(id):
    product = db.query('select * from product where id = $1', id).dictresult()
    result = product[0]
    return jsonify(result)

@app.route('/api/user/signup', methods=["POST"])
def signup():
    data = request.get_json()
    password = data['password']
    salt = bcrypt.gensalt()
    encrypted_password = bcrypt.hashpw(password.encode('utf-8'), salt)
    db.insert (
        "customer",
        username = data['username'],
        email = data['email'],
        password = encrypted_password,
        first_name = data['first_name'],
        last_name = data['last_name']
    )
    return "poop"

@app.route('/api/user/login', methods=["POST", "GET"])
def login():
    user = request.get_json()
    password = user['password']
    encrypted_password = db.query('select password from customer where username = $1', user['username']).namedresult()
    rehash = bcrypt.hashpw(password.encode('utf-8'), encrypted_password[0].password)
    if rehash == encrypted_password[0].password:
        token = uuid.uuid4()
        user_id = db.query('select id, first_name from customer where username = $1', user['username']).namedresult()
        db.insert (
            "auth_token",
            token = token,
            customer_id = user_id[0].id
        )
        login_data = {
            'token': token,
            'customer_id': user_id[0].id,
            'user_name' : user_id[0].first_name
        }
        return jsonify(login_data)

    else:
        return 'Fuck off, hacker!', 401

@app.route('/api/shopping_cart', methods=["POST"])
def add_to_cart():
    post_token = request.get_json().get('auth_token')
    product = request.get_json()
    customer_id = db.query('''
    select
        customer.id
    from
        customer, auth_token
    where
        customer.id = auth_token.customer_id and
        now() < token_expires and
        auth_token.token = $1
    ''', post_token).namedresult()
    if customer_id == []:
        return 'Forbidden', 403
    else:
        db.insert (
            "product_in_shopping_cart",
            product_id = product["product_id"],
            customer_id = customer_id[0].id
        )
        return 'post request'

@app.route('/api/shopping_cart', methods=["GET"])
def view_cart():
    get_token = request.args.get('auth_token')
    customer_id = db.query('''
    SELECT
        customer.id
    from
        customer, auth_token
    where
        customer.id = auth_token.customer_id and
        now() < token_expires and
        auth_token.token = $1
    ''', get_token).namedresult()
    if customer_id == []:
        return 'Forbidden', 403
    else:
        product_query = db.query('''
        SELECT
            product.name, product.image_path, product.price, product.id as "product_id"
        from
            product, product_in_shopping_cart, customer
        where
            product.id = product_in_shopping_cart.product_id and product_in_shopping_cart.customer_id = customer.id and
            customer.id = $1;
        ''', customer_id[0].id).dictresult()
        total_price = db.query("""
            SELECT sum(price)
            FROM product_in_shopping_cart
            INNER JOIN product ON product.id = product_id
            INNER JOIN auth_token ON auth_token.customer_id = product_in_shopping_cart.customer_id
            WHERE auth_token.token = $1""", get_token).namedresult()[0].sum
        return jsonify({
            'product_query': product_query,
            'total_price': total_price
        })




@app.route('/api/shopping_cart/checkout', methods=["POST"])
def checkout():
    post_token = request.get_json().get('auth_token')
    print 'this is the post_token', post_token
    formData = request.get_json()
    print 'this is formData', formData
    customer_id = db.query('''
    select
        customer.id
    from
        customer, auth_token
    where
        customer.id = auth_token.customer_id and
        now() < token_expires and
        auth_token.token = $1
    ''', post_token).namedresult()
    if customer_id == []:
        return 'Forbidden', 403
    else:
        customer_id = customer_id[0].id
        total_price = db.query("""
        SELECT sum(price)
            FROM product_in_shopping_cart
            INNER JOIN product ON product.id = product_id
            INNER JOIN auth_token ON auth_token.customer_id = product_in_shopping_cart.customer_id
            WHERE auth_token.token = $1""", post_token).namedresult()[0].sum
        purchased_items = db.query("""
        SELECT price, product.name, product.id
            FROM product_in_shopping_cart
            INNER JOIN product ON product.id = product_id
            INNER JOIN auth_token ON auth_token.customer_id = product_in_shopping_cart.customer_id
            WHERE auth_token.token = $1""", post_token).dictresult()
        purchase = db.insert('purchase', {
            'customer_id': customer_id,
            'total_price': total_price,
            'city': formData['city'],
            'street_address': formData['street_address'],
            'state': formData['state'],
            'post_code': formData['post_code'],
            'country': formData['country']
        })
        for item in purchased_items:
            db.insert('product_in_purchase', {
                'product_id': item['id'],
                'purchase_id': purchase['id']
            })
        db.query('DELETE FROM product_in_shopping_cart WHERE customer_id = $1', customer_id)
        return jsonify(purchase)








if __name__ == "__main__":
    app.run(debug=True)

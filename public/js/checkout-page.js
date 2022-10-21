// use this to pass loggedInUserEmail from server to client side
let loggedInUserEmail = document.querySelector("#loggedInUserEmail").innerText
let cartData = []
let subTotal = 0, tax = 0, total = 0

// make api request
const makeAPIRequest = (url, method, data) => {
    let fetchRequest;

    if (data) {
        console.log(`Data to be created or updated ${data}`);
        //create or update
        fetchRequest = fetch(url, {
            method: method,
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
    } else {
        //delete
        fetchRequest = fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    fetchRequest
        .then(response => {
            return (response.ok)
                ? response.json() : Promise.reject("Unable to create or update places");
        })
        .then(responseJSONData => {
            return responseJSONData.msg
        })
        .catch(err => {
            console.log(`Error : ${err}`);
        })

    return fetchRequest
}

// read cart from db
const getCartFromAPI = (url, method) => {

    fetch(url, { method: method, header: { 'Content-Type': 'application/json' } })
        .then(response => {
            return (response.ok) ? response.json() : Promise.reject(response.status);
        })
        .then(responseJSONData => {
            cartData = responseJSONData.classesCart

            // calculation
            calculateCartData()

            // display cart data
            displayCartData()

        })
        .catch(err => {
            console.log(`unable to retrieve data from API ${err}`);
        });
}

// removeBtnHandler
const removeBtnHandler = (classIdToRemove) => {

    console.log(`button remove${classIdToRemove} is clicked`)
    let updatedCart = []

    // update cartData
    for (const item of cartData) {
        if (item.classId !== classIdToRemove) {
            updatedCart.push(item)
        }
    }
    cartData = updatedCart
    console.log(cartData)

    // update cart to db
    makeAPIRequest(`/api/carts/${loggedInUserEmail}`, "PUT", cartData)

    // re-render to UI
    displayCartData()
}

// display cart data
const displayCartData = () => {

    document.querySelector(".checkout-subsub-container").innerHTML = ""
    for (const item of cartData) {
        document.querySelector(".checkout-subsub-container").innerHTML +=
            `
            <p id="descOf${item.classId}">${item.className} with ${item.classInstructor}<br>
            \$ ${item.classPrice} for ${item.classLength} min</p>
            <button id="remove${item.classId}" value="${item.classId}" 
            onclick="removeBtnHandler(this.value)">REMOVE</button>
            `
    }

    displayTotal()

}

// calculate cart data
const calculateCartData = () => {

    subTotal = 0, tax = 0, total = 0
    // non-membership
    if (document.querySelector("#noMembershipFromUI").checked) {
        // hide membership option
        document.querySelector("#memberTypeFromUI").style.display = "none"
        for (const item of cartData) {
            subTotal += item.classPrice
        }
    } else {
        // membership
        document.querySelector("#memberTypeFromUI").style.display = "block"
        if (document.querySelector("#memberTypeFromUI").value === "monthly") {
            subTotal = 75
        } else {
            subTotal = 900
        }
    }
    subTotal = Math.round(subTotal * 100) / 100
    tax = Math.round((subTotal * 0.13) * 100) / 100
    total = Math.round((subTotal + tax) * 100) / 100
}

// display subtotal, tax and total
const displayTotal = () => {

    calculateCartData()

    document.querySelector("#checkout-subtotal").innerText = `\$ ${subTotal}`
    document.querySelector("#checkout-tax").innerText = `\$ ${tax}`
    document.querySelector("#checkout-total").innerText = `\$ ${total}`
}

const payBtnHandler = () => {

    const userFirstNameFromUI = document.querySelector("#firstnameFromUI").value
    const userLastNameFromUI = document.querySelector("#lastnameFromUI").value
    let orderCreditCardNumFromUI = document.querySelector("#creditCardFromUI").value
    let orderCreditCardExpiryYearFromUI = document.querySelector("#creditCardExpiryYear").value
    let orderCreditCardExpiryMonthFromUI = document.querySelector("#creditCardExpiryMonth").value

    // validate user input
    if(userFirstNameFromUI == undefined || userLastNameFromUI == undefined || 
        orderCreditCardExpiryMonthFromUI == undefined || orderCreditCardExpiryYearFromUI == undefined ||
        orderCreditCardNumFromUI == undefined || 
        userFirstNameFromUI.trim() === "" || userLastNameFromUI.trim() === "" || 
        orderCreditCardExpiryMonthFromUI.trim() === "" || orderCreditCardExpiryYearFromUI.trim() === "" ||
        orderCreditCardNumFromUI.trim() === "" ){
            alert("Inputs cannot be blank!")
            return
        }
    orderCreditCardNumFromUI = parseInt(orderCreditCardNumFromUI)
    orderCreditCardExpiryYearFromUI = parseInt(orderCreditCardExpiryYearFromUI)
    orderCreditCardExpiryMonthFromUI = parseInt(orderCreditCardExpiryMonthFromUI)
    if(isNaN(orderCreditCardNumFromUI) || isNaN(orderCreditCardExpiryYearFromUI) || isNaN(orderCreditCardExpiryMonthFromUI)){
        alert("Credit card info must be number.")
        return
    }
    if(orderCreditCardExpiryYearFromUI < parseInt(new Date().getFullYear().toString().substr(-2)) ||
    (orderCreditCardExpiryYearFromUI == parseInt(new Date().getFullYear().toString().substr(-2)) &&
    orderCreditCardExpiryMonthFromUI < parseInt(new Date().toISOString().substr(5, 6)))){
        alert("Your credit card has expired.")
        return
    }

    // if cart is empty and user does not want to have membership, alert
    if(cartData.length == 0 && document.querySelector("#yesMembershipFromUI").checked == false){
        alert("Please add at least one class in cart, or choose a membership")
        return
    }

    // calculate cart
    calculateCartData()

    const orderId = Date.now()
    const orderToAdd = {
        orderId: orderId, // use Date.now() as orderId
        userEmail: loggedInUserEmail,
        userFirstName: userFirstNameFromUI,
        userLastName: userLastNameFromUI,
        userMembership:
            (document.querySelector("#yesMembershipFromUI").checked)
                ? document.querySelector("#memberTypeFromUI").value
                : "noMembership", // noMembership, monthly, yearly
        orderCreditCardNum: document.querySelector("#creditCardFromUI").value,
        orderCreditCardExpiryYear: document.querySelector("#creditCardExpiryYear").value,
        orderCreditCardExpiryMonth: document.querySelector("#creditCardExpiryMonth").value,
        orderClassesId: cartData, // array of classId's
        orderSubtotal: subTotal,
        orderTax: tax,
        orderTotal: total,
    }
    makeAPIRequest("/api/orders/add", "POST", orderToAdd)

    // empty cart after checked out
    makeAPIRequest(`/api/carts/${orderToAdd.userEmail}`, "PUT", [])

    // display confirmation page
    location.href = `/confirm/${orderToAdd.orderId}`
}


//----------------------------------------------------------------------------------------
// EXECUTION
// read cart from db
getCartFromAPI(`/api/carts/${loggedInUserEmail}`, "GET")

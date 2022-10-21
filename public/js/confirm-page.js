// use this to pass loggedInUserEmail from server to client side
let loggedInUserEmail = document.querySelector("#loggedInUserEmail").innerText

// display order id to ui
const getOrderIdFromAPI = (url, method) => {

    fetch(url, { method: method, header: { 'Content-Type': 'application/json' } })
        .then(response => {
            return (response.ok) ? response.json() : Promise.reject(response.status);
        })
        .then(responseJSONData => {
            let orderId = responseJSONData.orderId
            console.log



        })
        .catch(err => {
            console.log(`unable to retrieve data from API ${err}`);
        });
}


// empty cart


//----------------------------------------------------------------------------------------
// EXECUTION
// read order id from db
getCartFromAPI(`/api/orders/${loggedInUserEmail}`, "GET")

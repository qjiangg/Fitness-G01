// use this to pass loggedInUserEmail from server to client side
let loggedInUserEmail = document.querySelector("#loggedInUserEmail").innerText

let allClasses = []
let cartData = []

// read cart from db and update buttons, only if someone logged in
const getCartFromAPI = (url, method) => {


  fetch(url, { method: method, header: { 'Content-Type': 'application/json' } })
    .then(response => {
      return (response.ok) ? response.json() : Promise.reject(response.status);
    })
    .then(responseJSONData => {
      cartData = responseJSONData.classesCart

      // update button based on cart
      updateBookBtns()


    })
    .catch(err => {
      console.log(`unable to retrieve data from API ${err}`)
    })


}

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

// get all classes from db
const getClassesFromAPI = (url, method) => {

  fetch(url, { method: method, header: { 'Content-Type': 'application/json' } })
    .then(response => {
      return (response.ok) ? response.json() : Promise.reject(response.status);
    })
    .then(responseJSONData => {
      allClasses = responseJSONData
    })
    .catch(err => {
      console.log(`unable to retrieve data from API ${err}`)
    })
}


const updateBookBtns = () => {

  // update button based on cartData
  for (const item of cartData) {

    // disable buttons for item.classId
    document.querySelector(`#book-btn-${item.classId}`).style.backgroundColor = '#E8E9EC'
    document.querySelector(`#book-btn-${item.classId}`).style.cursor = `not-allowed`
    document.querySelector(`#booked-message-${item.classId}`).style.visibility = 'visible'
  }



}

// book button handler
const bookBtnHandler = (classIdToAdd) => {

  // no user logged in
  if (loggedInUserEmail === "" || loggedInUserEmail === undefined) {
    location.href = "/login"
    return
  }

  // if someone logged in
  if (cartData == undefined) {
    cartData = []
  }
  // add class to cart and update to db
  for (const item of allClasses) {
    if (item.classId === classIdToAdd) {
      cartData.push(item)
    }
  }
  console.log(cartData)

  // update cart to db
  makeAPIRequest(`/api/carts/${loggedInUserEmail}`, "PUT", cartData)

  // update buttons on this page
  updateBookBtns()

}


//----------------------------------------------------------------------------------------
// EXECUTION

// fetch all classes
getClassesFromAPI("/api/classes/all", "GET")


// check of someone logged in
if (loggedInUserEmail !== undefined) {
  const allBtns = document.querySelectorAll(".book-btn")
  for (const eachBtn of allBtns) {
    eachBtn.innerHTML = 'Book Now' // disable a tag
  }
  getCartFromAPI(`/api/carts/${loggedInUserEmail}`, "GET")
}
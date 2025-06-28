const APP_ID = "680d10a2466d44ecbc2f69c5306dc597"

let uid = sessionStorage.getItem('uid')
if(!uid){
    uid = String(Math.floor(Math.random() * 10000))
    sessionStorage.setItem('uid',uid)
}
let token = null;
let client;

const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')

// neu khong co phong chuyen ve main
if(!roomId){
    roomId = 'main'
}

let localTrack = []
let remoteTrack = {}
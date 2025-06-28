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

let localTracks = []
let remoteTracks = {}

let joinRoomInit = async() =>{
    client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    await client.join(APP_ID,roomId,token,uid)
    joinStream()
}
let joinStream = async() =>{
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks()
    
    let player = `<div class="video__container" id="user-container-${uid}">
                        <h1 class= "video-player" id = "user-${uid}"></h1>
                </div>`
    document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
    localTracks[1].play(`user-${uid}`)
}
joinRoomInit()
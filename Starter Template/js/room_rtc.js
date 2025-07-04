
const APP_ID = "948c45b360de4eddaf93090cfdf0f214"

let uid = sessionStorage.getItem('uid')
if(!uid){
    uid = String(Math.floor(Math.random() * 10000))
    sessionStorage.setItem('uid',uid)
}
let token = null;
let client;

let rtmClient;
let channel; 

const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')

// neu khong co phong chuyen ve main
if(!roomId){
    roomId = 'main'
}

let displayName = sessionStorage.getItem('display_name')
if(!displayName){
    window.location = 'lobby.html'
}

let localTracks = []
let remoteUsers = {};

let localScreenTracks;
let sharingScreen = false; 

let joinRoomInit = async() =>{
    
    try{
        // yeu cau token tu server
        const rtcResponse = await fetch(`http://localhost:8080/rtc_token?channelName=${roomId}&uid=${uid}`);
        if(!rtcResponse.ok){
            throw new Error(`HTTP error! status: ${rtcResponse.status}`);
        }
        const rtcData = await rtcResponse.json();
        rtcToken = rtcData.rtcToken;
        console.log("RTC Token đã nhận:", rtcToken);
        const rtmResponse = await fetch(`http://localhost:8080/rtm_token?uid=${uid}`);
        if(!rtmResponse.ok){
            throw new Error(`HTTP error! status: ${rtmResponse.status}`);
        }
        const rtmData = await rtmResponse.json();
        rtmToken = rtmData.rtmToken; // Lấy RTM token từ response
        console.log("RTM Token đã nhận:", rtmToken);
    }catch(error){
        console.error("Không thể lấy token từ máy chủ:", error);
        alert("Lỗi: Không thể tham gia phòng vì không lấy được token. Vui lòng kiểm tra máy chủ token.");
        return;
    }

    rtmClient = AgoraRTM.createInstance(APP_ID)
    channel = rtmClient.createChannel(roomId)
    
    await rtmClient.login({uid:uid, token: rtmToken }) // Sử dụng rtmToken ở đây!
    console.log('RTM client logged in successfully.'); 

    await rtmClient.addOrUpdateLocalUserAttributes({'name':displayName})
    
    await channel.join()

    channel.on('MemberJoined',handleMemberJoined)
    channel.on('MemberLeft',handleMemberLeft)
    channel.on('ChannelMessage',handlChannelMessage)

    getMembers()
    addBotMessageToDom(`Chào mừng ${displayName} đã gia nhập vào giáo phái 🙇🙇🙇`)  

    client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    await client.join(APP_ID,roomId,rtcToken,uid) // Sử dụng rtcToken ở đây!
    console.log('Agora RTC client joined successfully.');

    client.on('user-published',handleUserPublished)
    client.on('user-left',handleUserLeft)
    joinStream()
}


let joinStream = async() =>{
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks({
    video: {
        encoderConfig: {
            width: { min: 640, ideal: 1920, max: 1920 },
            height: { min: 480, ideal: 1080, max: 1080 }
        }
    },
    audio: true
    });
    
    let player = `<div class="video__container" id="user-container-${uid}">
                        <div class= "video-player" id = "user-${uid}"></div>
                </div>`
    document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
    document.getElementById(`user-container-${uid}`).addEventListener('click',expandVideoFrame) 
    localTracks[1].play(`user-${uid}`)

    await client.publish([localTracks[0],localTracks[1]])

}

let switchToCamera = async() =>{
    player = `<div class="video__container" id="user-container-${uid}">
                        <div class= "video-player" id = "user-${uid}"></div>
            </div>`
    displayFrame.insertAdjacentHTML('beforeend', player);

    await localTracks[0].setMuted(true)
    await localTracks[1].setMuted(true)

    document.getElementById('mic-btn').classList.remove('active')
    document.getElementById('screen-btn').classList.remove('active')

    localTracks[1].play(`user-${uid}`)
    await client.publish([localTracks[1]])
}


let handleUserPublished = async(user,mediaType) =>{
    
    remoteUsers[user.uid] = user

    await client.subscribe(user,mediaType)

    let player = document.getElementById(`user-container-${user.uid}`)

    if(player === null){
        player = `<div class="video__container" id="user-container-${user.uid}">
                        <div class= "video-player" id = "user-${user.uid}"></div>
                </div>`
    
        document.getElementById('streams__container').insertAdjacentHTML('beforeend', player)
        document.getElementById(`user-container-${user.uid}`).addEventListener('click',expandVideoFrame) 
    }
    if(displayFrame.style.display){
        let video = document.getElementById(`user-container-${user.uid}`)
        video.style.height = '100px'
        video.style.width = '100px'
    }
    if(mediaType === 'video'){
        user.videoTrack.play(`user-${user.uid}`)
    }
    
    if(mediaType === 'audio'){
        user.audioTrack.play()
    }
}

let handleUserLeft = async(user) =>{
    delete remoteUsers[user.uid]
    document.getElementById(`user-container-${user.uid}`).remove()

    if(userIdInDisplayFrame === `user-container-${user.uid}`){
        displayFrame.style.display = null

        let videoFrames = document.getElementsByClassName('video__container')

        for(let i = 0 ; videoFrames.length>i ; i++){
            videoFrames[i].style.height = '300px'
            videoFrames[i].style.width = '300px'
        }
    }
}


let toggleMic = async (e) =>{
    let button = e.currentTarget
    
    if(localTracks[0].muted){
        await localTracks[0].setMuted(false)
        button.classList.add('active')
    }else{
        await localTracks[0].setMuted(true)
        button.classList.remove('active')
    }
}


let toggleCamera = async (e) =>{
    let button = e.currentTarget

    if(localTracks[1].muted){
        await localTracks[1].setMuted(false)
        button.classList.add('active')
    }else{
        await localTracks[1].setMuted(true)
        button.classList.remove('active')
    }
}

let toggleScreen = async(e) =>{
    let screenButton = e.currentTarget
    let cameraButton = document.getElementById('camera-btn')

    if(!sharingScreen){
        sharingScreen = true
        
        screenButton.classList.add('active')
        cameraButton.classList.remove('active')
        cameraButton.style.display = 'none'

        localScreenTracks = await AgoraRTC.createScreenVideoTrack()

        document.getElementById(`user-container-${uid}`).remove()
        displayFrame.style.display = 'block'

        let player = `<div class="video__container" id="user-container-${uid}">
                        <div class= "video-player" id = "user-${uid}"></div>
                    </div>`
        displayFrame.insertAdjacentHTML('beforeend',player)
        document.getElementById(`user-container-${uid}`).addEventListener('click',expandVideoFrame)

        userIdInDisplayFrame = `user-container-${uid}`
        localScreenTracks.play(`user-${uid}`)

        await client.unpublish([localScreenTracks[1]])
        await client.publish([localScreenTracks])

        let videoFrames = document.getElementsByClassName('video__container')

        for(let i = 0 ; videoFrames.length > i ;i++){
            if(videoFrames[i].id != userIdInDisplayFrame){
            videoFrames[i].style.height = '100px'
            videoFrames[i].style.width = '100px'
        }
    
  }

    }else{
        sharingScreen = false
        cameraButton.style.display = 'block'
        document.getElementById(`user-container-${uid}`).remove()
        await client.unpublish([localScreenTracks])

        switchToCamera()
    }
}






document.getElementById('camera-btn').addEventListener('click',toggleCamera)
document.getElementById('mic-btn').addEventListener('click',toggleMic)
document.getElementById('screen-btn').addEventListener('click',toggleScreen)

joinRoomInit()
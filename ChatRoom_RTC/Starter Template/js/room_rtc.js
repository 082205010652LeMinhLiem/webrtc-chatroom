const APP_ID = "30aed769d4af468b8351705359f7299c"

let uid = sessionStorage.getItem('uid')
if(!uid){
    uid = String(Math.floor(Math.random() * 10000))
    sessionStorage.setItem('uid',uid)
}

// Các biến này sẽ được khởi tạo trong joinRoomInit
let client;
let rtmClient;
let channel; 

const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')

// nếu không có phòng, đặt mặc định là 'main'
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

let joinRoomInit = async () => {
    let rtcToken;
    let rtmToken;

    try {
        // Đổi từ hostname sang domain thật
        const serverUrl = window.location.origin.replace('http:', 'https:');

        // Lấy RTC token
        const rtcResponse = await fetch(`${serverUrl}/token/rtc?channelName=${roomId}&uid=${uid}`);
        if (!rtcResponse.ok) {
            throw new Error(`HTTP error! status: ${rtcResponse.status}`);
        }
        const rtcData = await rtcResponse.json();
        rtcToken = rtcData.rtcToken;
        console.log("RTC Token đã nhận:", rtcToken);

        // Lấy RTM token
        const rtmResponse = await fetch(`${serverUrl}/token/rtm?uid=${uid}`);
        if (!rtmResponse.ok) {
            throw new Error(`HTTP error! status: ${rtmResponse.status}`);
        }
        const rtmData = await rtmResponse.json();
        rtmToken = rtmData.rtmToken;
        console.log("RTM Token đã nhận:", rtmToken);
    } catch (error) {
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
    channel.on('ChannelMessage',handleChannelMessage)

    getMembers()
    addBotMessageToDom(`Chào mừng ${displayName} đã gia nhập vào giáo phái 🙇🙇🙇`) 	

    client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    await client.join(APP_ID,roomId,rtcToken,uid) // Sử dụng rtcToken ở đây!
    console.log('Agora RTC client joined successfully.');

    client.on('user-published',handleUserPublished)
    client.on('user-left',handleUserLeft)
}


let joinStream = async() =>{
    document.getElementById('join-btn').style.display = 'none'
    document.getElementsByClassName('stream__actions')[0].style.display = 'flex' 	
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
    let player = `<div class="video__container" id="user-container-${uid}">
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

        await client.unpublish([localTracks[1]]) // unpublish camera track
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


let leaveStream = async(e) =>{
    e.preventDefault()

    document.getElementById('join-btn').style.display = 'block'
    document.getElementsByClassName('stream__actions')[0].style.display = 'none'

    for(let i = 0 ; localTracks.length>i;i++){
        localTracks[i].stop()
        localTracks[i].close() 	 
    }

    await client.unpublish([localTracks[0],localTracks[1]])

    if(localScreenTracks){
        await client.unpublish([localScreenTracks])
    }

    document.getElementById(`user-container-${uid}`).remove()

    if(userIdInDisplayFrame === `user-container-${uid}`){
        displayFrame.style.display = null

        let videoFrames = document.getElementsByClassName('video__container')
        for(let i = 0 ; videoFrames.length > i ; i++){
            videoFrames[i].style.height ='300px'
            videoFrames[i].style.width = '300px'
        }
    }
    channel.sendMessage({text:JSON.stringify({
        'type':'user-left',
        'uid':uid
    })})
}

document.getElementById('camera-btn').addEventListener('click',toggleCamera)
document.getElementById('mic-btn').addEventListener('click',toggleMic)
document.getElementById('screen-btn').addEventListener('click',toggleScreen)
document.getElementById('join-btn').addEventListener('click',joinStream) 
document.getElementById('leave-btn').addEventListener('click',leaveStream) 


joinRoomInit()
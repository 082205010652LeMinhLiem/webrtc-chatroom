let handleMemberJoined = async(MemberId) => {
    console.log('Member has Joined the room:', MemberId)
    addMembertoDom(MemberId)

    let members = await channel.getMembers()
    updateMemberTotal(members)
}

let addMembertoDom = async(MemberId)=>{
    
    let {name} = await rtmClient.getUserAttributesByKeys(MemberId, ['name'])
    
    
    let membersWrapper = document.getElementById('member__list')
    let memberItem = ` <div class="member__wrapper" id="member__${MemberId}_wrapper">
                            <span class="green__icon"></span>
                            <p class="member_name">${name}</p>
                        </div>`
    membersWrapper.insertAdjacentHTML('beforeend',memberItem)
}

let updateMemberTotal = async(members) => {
    let total = document.getElementById('members__count')
    total.innerText = members.length
}

let handleMemberLeft = async(MemberId) => {
    removeMemberFromDom(MemberId)
    let members = await channel.getMembers();
    updateMemberTotal(members);
}

let removeMemberFromDom = async(MemberId) => {
    let memberWrapper = document.getElementById(`member__${MemberId}_wrapper`)
    if(memberWrapper){
        memberWrapper.remove()
    }
}

let getMembers = async() =>{
    let members = await channel.getMembers()
    updateMemberTotal(members)
    for(let i = 0 ; members.length > i ; i++){
        let memberId = members[i]
        addMembertoDom(memberId)

    }
}

let handlChannelMessage = async(messageData,memberId)=>{
    // thong bao da nhan duoc thong bao moi
    console.log('Receive a new message')
    let data = JSON.parse(messageData.text)
    if(data.type === 'chat'){
        addMessageToDom(data.displayName, data.message)
    }
}

let sendMessage = async(e) =>{
    e.preventDefault()

    let message = e.target.message.value
    channel.sendMessage({text:JSON.stringify({
        'type':'chat',
        'message':message,
        'displayName':displayName
    })})
    addMessageToDom(displayName, message)
    e.target.reset()
}

let addMessageToDom = (name, message) =>{
    let messageWrapper = document.getElementById('messages')

    let newMessage = `<div class="message__wrapper">
                            <div class="message__body">
                                <strong class="message__author">${name}</strong>
                                <p class="message__text">${message}</p>
                            </div>
                        </div>`
    messageWrapper.insertAdjacentHTML('beforeend',newMessage)

    let lastMessage = document.querySelector('#messages .message__wrapper:last-child')
    if(lastMessage){
        lastMessage.scrollIntoView()
    }

}

let leaveChannel = async() => {
    await channel.leave()
    await rtmClient.logout()
}

window.addEventListener('beforeunload', leaveChannel)

let messageForm = document.getElementById('message__form')
messageForm.addEventListener('submit',sendMessage)
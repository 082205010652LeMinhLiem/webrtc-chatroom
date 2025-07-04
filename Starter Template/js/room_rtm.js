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

let leaveChannel = async() => {
    await channel.leave()
    await rtmClient.logout()
}

window.addEventListener('beforeunload', leaveChannel)
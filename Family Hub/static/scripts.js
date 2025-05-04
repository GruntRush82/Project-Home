document.addEventListener("DOMContentLoaded", function () {
    const choreList = document.getElementById("chore-list");

    // Populate the user dropdown
    fetch("/users")
        .then(response => response.json())
        .then(users => {
            const userSelect = document.getElementById('user-select');
            users.forEach(user => {
                const option = document.createElement("option");
                option.value = user.id;
                option.textContent = user.username;
                userSelect.appendChild(option);
            });
        });

    // Handle creating a new user
    document.getElementById('create-user-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const username = document.getElementById('username-input').value;

        fetch("/users", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username })
        })
        .then(res => res.json())
        .then(user => {
            const userSelect = document.getElementById('user-select');
            const option = document.createElement("option");
            option.value = user.id;
            option.textContent = user.username;
            userSelect.appendChild(option);
        });
    });

    // Handle adding a new chore
    document.getElementById('add-chore-form').addEventListener('submit', function (e) {
        e.preventDefault();

        const description = document.getElementById('chore-input').value;
        const userId = document.getElementById('user-select').value;
        const day = document.getElementById('day-select').value;
        const rotation = document.getElementById('rotation-select').value;

        let rotationOrder = [];
        if (rotation === "rotating") {
            const pinnedUser = document.getElementById("rotation-pinned-user")?.dataset.name;
            const extraUsers = [...document.querySelectorAll("#rotation-list .rotation-user")]
                .map(div => div.dataset.name);
        
            if (pinnedUser) {
                rotationOrder = [pinnedUser, ...extraUsers];
            }
        }
        console.log("Rotation Order to submit:", rotationOrder);
        fetch("/chores", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: description,
                user_id: userId,
                day: day,
                rotation_type: rotation,
                rotation_order: rotationOrder
            })
        })
        
        .then(() => loadChores());
    });
    // Rotation select behavior

    document.getElementById("rotation-select").addEventListener("change", function () {
        console.log("Rotation type changed:", this.value);

        const rotationType = this.value;
        const userSelect = document.getElementById("user-select");
        const pinnedUserDiv = document.getElementById("rotation-pinned-user");
        const rotationListContainer = document.getElementById("rotation-list-container");

        let starterUser = userSelect.value;
        console.log("User ID selected:", starterUser);


        if (rotationType === "rotating") {

            // If no user is selected, auto-select the first valid one
            if (!starterUser) {
                const firstValidOption = [...userSelect.options].find(opt => opt.value && !opt.disabled);
                if (firstValidOption) {
                    starterUser = firstValidOption.textContent;
                    userSelect.value = firstValidOption.value; // update visible dropdown
                }
            } else {
                // Convert ID back to name (from dropdown)
                const selectedOption = userSelect.querySelector(`option[value="${starterUser}"]`);
                starterUser = selectedOption?.textContent || starterUser;
            }

            if (starterUser) {
                pinnedUserDiv.textContent = `${starterUser} (Starter)`;
                pinnedUserDiv.dataset.name = starterUser;
                rotationListContainer.style.display = "block";
                document.getElementById("rotation-setup").style.display = "block";
                console.log("Pinned user display set to:", pinnedUserDiv.textContent);
            }
             else {
                pinnedUserDiv.textContent = "";
                pinnedUserDiv.removeAttribute("data-name");
                rotationListContainer.style.display = "none";
                document.getElementById("rotation-setup").style.display = "none";
            }


        } else {
            // Reset everything if not rotating
            pinnedUserDiv.textContent = "";
            pinnedUserDiv.removeAttribute("data-name");
            document.getElementById("rotation-list").innerHTML = "";
            rotationListContainer.style.display = "none";
        }


    });

    document.getElementById("user-select").addEventListener("change", function () {
        const rotationType = document.getElementById("rotation-select").value;
        if (rotationType !== "rotating") return;
    
        const userSelect = this;
        const pinnedUserDiv = document.getElementById("rotation-pinned-user");
        const selectedOption = userSelect.options[userSelect.selectedIndex];
        const starterUser = selectedOption?.textContent;
    
        if (starterUser) {
            // Remove starterUser from rotation-list if already there
            const rotationList = document.getElementById("rotation-list");
            const existing = [...rotationList.querySelectorAll(".rotation-user")];
            existing.forEach(el => {
                if (el.dataset.name === starterUser) {
                    rotationList.removeChild(el);
                }
            });
    
            // Update pinned display
            pinnedUserDiv.textContent = `${starterUser} (Starter)`;
            pinnedUserDiv.dataset.name = starterUser;
        }
    });
    

    // Enable drag sorting of rotation list (excluding pinned user)
    Sortable.create(document.getElementById("rotation-list"), {
        animation: 150,
        forceFallback: true,          // Enables fallback drag mode (better for touch)
        fallbackClass: "dragging",   // Optional: class applied while dragging
        fallbackOnBody: true,        // Optional: attach drag element to body
        scroll: true                 // Optional: enables scrolling while dragging
    });

    // Add user to rotation list
    document.getElementById("add-user-btn").addEventListener("click", function () {
        const select = document.getElementById("rotation-user-select");
        const value = select.value;
        if (!value) return;

        // Avoid duplicates
        const pinnedUser = document.getElementById("rotation-pinned-user")?.dataset.name;
        const existing = [...document.querySelectorAll("#rotation-list .rotation-user")];
        
        // If user is already pinned or already in the rotation list, don't add
        if (pinnedUser === value || existing.some(el => el.dataset.name === value)) return;
        

        const div = document.createElement("div");
        div.className = "rotation-user";
        div.textContent = value;
        div.dataset.name = value;
        document.getElementById("rotation-list").appendChild(div);

        select.value = ""; // reset dropdown
    });


    // Fetch all chores and render them grouped by user
    function loadChores() {
        fetch("/chores")
            .then(res => res.json())
            .then(chores => {
                const grouped = groupChoresByUser(chores);
                const usersWithChores = Object.entries(grouped).map(([userId, userChores]) => ({
                    id: userId,
                    name: userChores[0]?.username || "Unknown",
                    chores: userChores.map(chore => ({
                        id: chore.id,
                        description: chore.description,
                        day: chore.day,
                        status: chore.completed ? "Completed" : "Incomplete",
                        rotation: chore.rotation_type,
                        rotation_order: chore.rotation_order
                    }))
                }));
                console.log("Fetched chores:", chores.map(c => ({
                    id: c.id,
                    description: c.description,
                    rotation_order: c.rotation_order,
                    type: typeof c.rotation_order
                })));
                
                renderUserChores(usersWithChores);
            });
    }

    function groupChoresByUser(chores) {
        return chores.reduce((acc, chore) => {
            if (!acc[chore.user_id]) acc[chore.user_id] = [];
            acc[chore.user_id].push(chore);
            return acc;
        }, {});
    }

    function renderUserChores(users) {
        choreList.innerHTML = "";
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        users.forEach(user => {
            const section = document.createElement("div");
            section.className = "user-section";

            const header = document.createElement("div");
            header.className = "user-header";
            header.innerHTML = `
                <div class="user-name">${user.name}</div>
                <button class="delete-user" data-user-id="${user.id}">Delete User</button>
            `;
            

            const daysHeader = document.createElement("div");
            daysHeader.className = "days-header";
            days.forEach(day => {
                const dayDiv = document.createElement("div");
                dayDiv.textContent = day;
                daysHeader.appendChild(dayDiv);
            });

            const userRow = document.createElement("div");
            userRow.className = "user-row";
            days.forEach(day => {
                const col = document.createElement("div");
                col.className = "day-col";
                user.chores.filter(chore => chore.day === day).forEach(chore => {
                    const choreCard = document.createElement("div");
                    choreCard.className = "chore-item";
                    if (chore.status === "Completed") {
                        choreCard.classList.add("completed");
                    }
                    if (chore.rotation === "rotating") {
                        choreCard.classList.add("rotating");
                    }
                    
                    choreCard.setAttribute("data-id", chore.id);
                    
                    // Build the rotation list (for display only, NOT logic)
                    let rotationHTML = '';
                    if (chore.rotation === "rotating") {
                        rotationHTML += `<div class="rotation-display">Rotation Order:<br>`;
                        if (chore.rotation_order && chore.rotation_order.length) {
                            rotationHTML += chore.rotation_order.map(name => `<div>${name}</div>`).join("");
                        } else {
                            rotationHTML += `<div>Unknown</div>`;
                        }
                        rotationHTML += `</div>`;
                    }
                    
                    choreCard.innerHTML = `
                        <div class="chore-title">${chore.description}</div>
                        <div class="chore-status">Status: ${chore.status}</div>
                        <div class="chore-rotation">Rotation: ${chore.rotation}</div>
                        ${chore.rotation === "rotating" && chore.rotation_order?.length ? `
                            <div class="rotation-display">
                                Rotation Order:<br>
                                ${chore.rotation_order.map(name => `<div>${name}</div>`).join("")}
                            </div>` : ""
                        }
                        <div class="chore-buttons">
                            <div class="top-row">
                                <button class="delete-btn" onclick="deleteChore(${chore.id})">Delete</button>
                                <button class="edit-btn" onclick="editChore(${chore.id})">Edit</button>
                            </div>
                            <button class="primary-btn" onclick="toggleCompleted(${chore.id})">
                                ${chore.status === "Completed" ? "Undo" : "Done!"}
                            </button>
                        </div>
                    `;

                    
                
                    col.appendChild(choreCard);
                });
                userRow.appendChild(col);
            });

            section.appendChild(header);
            section.appendChild(daysHeader);
            section.appendChild(userRow);
            choreList.appendChild(section);
        });
    }

    loadChores();
});

function deleteChore(id) {
    fetch(`/chores/${id}`, { method: 'DELETE' })
        .then(() => document.querySelector(`[data-id='${id}']`)?.remove());
}

function editChore(id) {
    const newDesc = prompt("New description:");
    if (newDesc) {
        fetch(`/chores/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: newDesc })
        }).then(() => location.reload());
    }
}

function toggleCompleted(id) {
    fetch(`/chores/${id}`)
        .then(res => res.json())
        .then(chore => {
            fetch(`/chores/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !chore.completed })
            }).then(() => {
                const card = document.querySelector(`[data-id='${id}']`);
                if (card) {
                    const statusElement = card.querySelector(".chore-status");
                    const buttonElement = card.querySelector(".primary-btn, .undo-btn");

                    if (!chore.completed) {
                        // Mark as completed
                        card.classList.add("completed");
                        card.classList.add("pop-big");
                        statusElement.innerText = "Status: Completed";
                        if (buttonElement) {
                            buttonElement.innerText = "Undo";
                            buttonElement.classList.add("undo-btn");
                        }
                    } else {
                        // Mark as incomplete
                        card.classList.remove("completed");
                        card.classList.add("pop-small");
                        statusElement.innerText = "Status: Incomplete";
                        if (buttonElement) {
                            buttonElement.innerText = "Done!";
                            buttonElement.classList.remove("undo-btn");
                        }
                    }
                    

                    // Remove the pop class after a short animation delay
                    setTimeout(() => {
                        card.classList.remove("pop-big", "pop-small");
                    }, 200);
                }
            });
        });
}



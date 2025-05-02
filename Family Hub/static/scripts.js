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

        fetch("/chores", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: description,
                user_id: userId,
                day: day,
                rotation_type: rotation
            })
        })
        .then(() => loadChores());
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
                        rotation: chore.rotation_type
                    }))
                }));
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
                    
                    choreCard.setAttribute("data-id", chore.id);
                    choreCard.innerHTML = `
                        <div class="chore-title">${chore.description}</div>
                        <div class="chore-status">Status: ${chore.status}</div>
                        <div class="chore-rotation">Rotation: ${chore.rotation}</div>
                        <div class="chore-buttons">
                            <div class="top-row">
                                <button class="delete-btn" onclick="deleteChore(${chore.id})">Delete</button>
                                <button class="edit-btn" onclick="editChore(${chore.id})">Edit</button>
                            </div>
                            <button class="primary-btn" onclick="toggleCompleted(${chore.id})">${chore.status === "Completed" ? "Undo" : "Done!"}</button>
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



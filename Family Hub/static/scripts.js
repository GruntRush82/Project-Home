document.addEventListener("DOMContentLoaded", function () {
    const choreList = document.getElementById("chore-list");

    // Load users into the dropdown
    fetch("/users")
        .then(res => res.json())
        .then(users => {
            const userSelect = document.getElementById("user-select");
            users.forEach(user => {
                const option = document.createElement("option");
                option.value = user.id;
                option.textContent = user.username;
                userSelect.appendChild(option);
            });
        });

    // Create new user
    document.getElementById("create-user-form").addEventListener("submit", function (e) {
        e.preventDefault();
        const username = document.getElementById("username-input").value;

        fetch("/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
        })
            .then(res => res.json())
            .then(user => {
                const userSelect = document.getElementById("user-select");
                const option = document.createElement("option");
                option.value = user.id;
                option.textContent = user.username;
                userSelect.appendChild(option);
            });
    });

    // Add new chore
    document.getElementById("add-chore-form").addEventListener("submit", function (e) {
        e.preventDefault();

        const description = document.getElementById("chore-input").value;
        const userId = document.getElementById("user-select").value;
        const day = document.getElementById("day-select").value;
        const rotation = document.getElementById("rotation-select").value;

        let rotationOrder = [];
        if (rotation === "rotating") {
            const pinnedUser = document.getElementById("rotation-pinned-user")?.dataset.name;
            const extraUsers = [...document.querySelectorAll("#rotation-list .rotation-user")]
                .map(div => div.dataset.name);
            if (pinnedUser) rotationOrder = [pinnedUser, ...extraUsers];
        }

        fetch("/chores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                description,
                user_id: userId,
                day,
                rotation_type: rotation,
                rotation_order: rotationOrder
            })
        }).then(() => loadChores());
    });

    // Handle rotation UI change
    document.getElementById("rotation-select").addEventListener("change", function () {
        const rotationType = this.value;
        const userSelect = document.getElementById("user-select");
        const pinnedUserDiv = document.getElementById("rotation-pinned-user");
        const rotationListContainer = document.getElementById("rotation-list-container");

        let starterUser = userSelect.value;
        if (!starterUser) {
            const firstOption = [...userSelect.options].find(opt => opt.value && !opt.disabled);
            if (firstOption) {
                starterUser = firstOption.textContent;
                userSelect.value = firstOption.value;
            }
        } else {
            const selectedOption = userSelect.querySelector(`option[value="${starterUser}"]`);
            starterUser = selectedOption?.textContent || starterUser;
        }

        if (rotationType === "rotating") {
            if (starterUser) {
                pinnedUserDiv.textContent = `${starterUser} (Starter)`;
                pinnedUserDiv.dataset.name = starterUser;
                rotationListContainer.style.display = "block";
                document.getElementById("rotation-setup").style.display = "block";
            } else {
                pinnedUserDiv.textContent = "";
                pinnedUserDiv.removeAttribute("data-name");
                rotationListContainer.style.display = "none";
                document.getElementById("rotation-setup").style.display = "none";
            }
        } else {
            pinnedUserDiv.textContent = "";
            pinnedUserDiv.removeAttribute("data-name");
            document.getElementById("rotation-list").innerHTML = "";
            rotationListContainer.style.display = "none";
        }
    });

    // Keep rotation pinned user updated when selection changes
    document.getElementById("user-select").addEventListener("change", function () {
        const rotationType = document.getElementById("rotation-select").value;
        if (rotationType !== "rotating") return;

        const selectedOption = this.options[this.selectedIndex];
        const starterUser = selectedOption?.textContent;

        if (starterUser) {
            const rotationList = document.getElementById("rotation-list");
            [...rotationList.querySelectorAll(".rotation-user")].forEach(el => {
                if (el.dataset.name === starterUser) rotationList.removeChild(el);
            });

            const pinnedUserDiv = document.getElementById("rotation-pinned-user");
            pinnedUserDiv.textContent = `${starterUser} (Starter)`;
            pinnedUserDiv.dataset.name = starterUser;
        }
    });

    // Enable drag sorting for rotation list
    Sortable.create(document.getElementById("rotation-list"), {
        animation: 150,
        forceFallback: true,
        fallbackClass: "dragging",
        fallbackOnBody: true,
        scroll: true
    });

    // Add user to rotation list
    document.getElementById("add-user-btn").addEventListener("click", function () {
        const select = document.getElementById("rotation-user-select");
        const value = select.value;
        if (!value) return;

        const pinnedUser = document.getElementById("rotation-pinned-user")?.dataset.name;
        const existing = [...document.querySelectorAll("#rotation-list .rotation-user")];

        if (pinnedUser === value || existing.some(el => el.dataset.name === value)) return;

        const div = document.createElement("div");
        div.className = "rotation-user";
        div.textContent = value;
        div.dataset.name = value;
        document.getElementById("rotation-list").appendChild(div);
        select.value = "";
    });

    // Fetch and display all chores
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
                        rotation_order: Array.isArray(chore.rotation_order) ? chore.rotation_order : []
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
            section.appendChild(header);

            const daysHeader = document.createElement("div");
            daysHeader.className = "days-header";
            days.forEach(day => {
                const dayDiv = document.createElement("div");
                dayDiv.textContent = day;
                daysHeader.appendChild(dayDiv);
            });
            section.appendChild(daysHeader);

            const userRow = document.createElement("div");
            userRow.className = "user-row";

            days.forEach(day => {
                const col = document.createElement("div");
                col.className = "day-col";

                user.chores.filter(chore => chore.day === day).forEach(chore => {
                    const choreCard = document.createElement("div");
                    choreCard.className = "chore-item";
                    choreCard.setAttribute("data-id", chore.id);
                    
                    const cardInnerWrapper = document.createElement("div");
                    cardInnerWrapper.className = "card-inner-wrapper";
                    cardInnerWrapper.style.position = "relative";  // Ensure rotation indicator stays scoped
                    
                    // Add the rotation indicator only to rotating cards
                    if (chore.rotation === "rotating") {
                        choreCard.classList.add("rotating");
                    
                        if (Array.isArray(chore.rotation_order) && chore.rotation_order.length) {
                            const rotationDiv = document.createElement("div");
                            rotationDiv.className = "rotation-indicator";
                            rotationDiv.innerHTML = chore.rotation_order.map(name => `<div>${name}</div>`).join("");
                            cardInnerWrapper.appendChild(rotationDiv);  // Attach it inside the wrapper
                        }
                    }

                    if (chore.status === "Completed") {
                        choreCard.classList.add("completed");
                    }

                    const cardContent = document.createElement("div");
                    cardContent.innerHTML = `
                        <div class="chore-title">${chore.description}</div>
                        <div class="chore-status">Status: ${chore.status}</div>
                        <div class="chore-rotation">Rotation: ${chore.rotation}</div>
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
                    cardInnerWrapper.appendChild(cardContent);   // ✅ put content inside the wrapper
                    choreCard.appendChild(cardInnerWrapper);     // ✅ add wrapper to card
                    
                    col.appendChild(choreCard);
                });

                userRow.appendChild(col);
            });

            section.appendChild(userRow);
            choreList.appendChild(section);
        });
    }

    loadChores();
});

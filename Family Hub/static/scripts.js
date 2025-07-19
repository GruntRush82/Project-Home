document.addEventListener("DOMContentLoaded", function () {
    const choreList = document.getElementById("chore-list");
    const confettiDone = new Set();
    /* ---------- user‑filter bar ---------- */
    let currentFilter = "all";                 // "all" or a user‑id string

    function renderFilterBar(users) {
        // create (or reuse) the bar
        let bar = document.getElementById("user-filter-bar");
        if (!bar) {
            bar = document.createElement("div");
            bar.id = "user-filter-bar";
            bar.className = "filter-bar";

            choreList.parentNode.insertBefore(bar, choreList);

        }
        bar.innerHTML = "";                    // clear & rebuild

        const addBtn = (label, value) => {
            const btn = document.createElement("button");
            btn.textContent = label;
            btn.className = "filter-btn" + (currentFilter === value ? " active" : "");
            btn.onclick = () => {
                currentFilter = value;
                renderFilterBar(users);        // refresh highlight
                renderUserChores(users);       // redraw grid
            };
            bar.appendChild(btn);
        };

        addBtn("All", "all");
        users.forEach(u => addBtn(u.name, String(u.id)));
    }

    // Populate the user dropdown
    fetch("/users")
    .then(res => res.json())
    .then(users => {
        const mainSel  = document.getElementById("user-select");
        const rotSel   = document.getElementById("rotation-user-select");

        users.forEach(u => {
            // main “Add Chore” dropdown
            const opt1 = document.createElement("option");
            opt1.value = u.id;
            opt1.textContent = u.username;
            mainSel.appendChild(opt1);

            // rotation “extra users” dropdown (name value, not id)
            const opt2 = document.createElement("option");
            opt2.value = u.username;
            opt2.textContent = u.username;
            rotSel.appendChild(opt2);
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
                renderFilterBar(usersWithChores);
            });
    }
// ---------------------------------------------------------------------------
// Delete‑user handler (delegated)
// ---------------------------------------------------------------------------
    document.addEventListener("click", async (ev) => {
        // look for a click on a .delete-user button
        const btn = ev.target.closest(".delete-user");
        if (!btn) return;                          // click wasn’t on that button

        const userId   = btn.dataset.userId;
        const userName = btn.closest(".user-header")
                            ?.querySelector(".user-name")?.textContent ?? "";

        if (!userId) return;

        // confirmation dialog
        const ok = confirm(`Delete ${userName || "this user"} and ALL their chores?`);
        if (!ok) return;

        try {
            const res = await fetch(`/users/${userId}`, { method: "DELETE" });
            if (!res.ok) throw new Error(`Server responded ${res.status}`);
            // refresh UI
            loadChores();
            alert(`${userName || "User"} deleted.`);
        } catch (err) {
            console.error(err);
            alert("Failed to delete user – see console for details.");
        }
    });

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
            if (currentFilter !== "all" && currentFilter !== String(user.id)) return;
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
    document.getElementById('reset-week-btn').addEventListener('click', () => {
        fetch('/chores/reset', { method: 'POST' })
        .then(res => res.ok && loadChores());   // redraw with rotated assignments
    });
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
                    const userSection   = card.closest(".user-section");
                    const stillIncomplete =
                        userSection.querySelectorAll(".chore-item:not(.completed)").length;

                    if (stillIncomplete === 0) {
                        confetti({ spread: 70, particleCount: 120, origin: { y: 0.3 } });
                        document.getElementById('cheer-sound').play();
                    }


                }
                loadChores();
            });
        });
}



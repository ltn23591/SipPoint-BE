// Role enum and helpers
const ROLE = {
    USER: 0,
    ADMIN: 1,
};

function fromString(value) {
    if (value === undefined || value === null) return undefined;
    const s = String(value).toLowerCase();
    if (s === 'admin') return ROLE.ADMIN;
    if (s === 'user') return ROLE.USER;
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
}

module.exports = { ROLE, fromString };

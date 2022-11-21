module.exports = {
    parseCategories: (arg) => {
        let x = arg
        x = x.replace("]", "")
        x = x.replace("[", "")

        const p = arg.split(",")

        if (p.length !== 1) {
            const firstElement = p.shift().trim()
            const lastElement = p.pop().trim()

            return [firstElement, ...p.map(str => str.trim()), lastElement]
        } else {
            return [x]
        }
    }
}


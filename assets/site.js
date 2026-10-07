const pageTitles = {
  home: 'Sam Grouchnikov',
  work: 'Projects',
  experience: 'Experience',
  research: 'Research',
  about: 'Skills',
  contact: 'Contact'
}

let renderRequest = 0
let skillsNetworkObserver = null

function initSkillsNetwork(root) {
  const network = root.querySelector('[data-skills-network]')
  if (!network) return null

  const svg = network.querySelector('.skills-network-wires')
  const skillNodes = [...network.querySelectorAll('[data-skill]')]
  const workNodes = [...network.querySelectorAll('[data-project]')]
  const edges = []
  let pinnedNode = null

  skillNodes.forEach((skillNode) => {
    const projectIds = skillNode.dataset.connects.split(/\s+/).filter(Boolean)
    projectIds.forEach((projectId) => {
      const edge = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      edge.classList.add('skill-edge')
      edge.dataset.skill = skillNode.dataset.skill
      edge.dataset.project = projectId
      edge.dataset.kind = skillNode.dataset.kind
      svg.append(edge)
      edges.push(edge)
    })
    skillNode.setAttribute('aria-pressed', 'false')
  })
  workNodes.forEach((node) => node.setAttribute('aria-pressed', 'false'))

  function drawEdges() {
    const networkRect = network.getBoundingClientRect()
    if (!networkRect.width || !networkRect.height) return
    svg.setAttribute('viewBox', `0 0 ${networkRect.width} ${networkRect.height}`)
    edges.forEach((edge) => {
      const skillNode = skillNodes.find((node) => node.dataset.skill === edge.dataset.skill)
      const workNode = workNodes.find((node) => node.dataset.project === edge.dataset.project)
      if (!skillNode || !workNode) return
      const skillRect = skillNode.getBoundingClientRect()
      const workRect = workNode.getBoundingClientRect()
      const startX = skillRect.right - networkRect.left
      const startY = skillRect.top + skillRect.height / 2 - networkRect.top
      const endX = workRect.left - networkRect.left
      const endY = workRect.top + workRect.height / 2 - networkRect.top
      const curve = Math.max(36, (endX - startX) * .48)
      edge.setAttribute('d', `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`)
    })
  }

  function clearHighlights() {
    network.classList.remove('has-active')
    skillNodes.forEach((node) => node.classList.remove('is-highlighted', 'is-dimmed'))
    workNodes.forEach((node) => node.classList.remove('is-highlighted', 'is-dimmed'))
    edges.forEach((edge) => edge.classList.remove('is-highlighted', 'is-dimmed'))
    skillNodes.concat(workNodes).forEach((node) => node.setAttribute('aria-pressed', 'false'))
  }

  function highlight(node) {
    const selectedSkill = node.dataset.skill
    const selectedProject = node.dataset.project
    const projectIds = selectedSkill ?
      node.dataset.connects.split(/\s+/).filter(Boolean) : [selectedProject]
    const skillIds = selectedProject ?
      skillNodes.filter((skillNode) => skillNode.dataset.connects.split(/\s+/).includes(selectedProject)).map((skillNode) => skillNode.dataset.skill) : [selectedSkill]

    network.classList.add('has-active')
    skillNodes.forEach((skillNode) => {
      const connected = skillIds.includes(skillNode.dataset.skill)
      skillNode.classList.toggle('is-highlighted', connected)
      skillNode.classList.toggle('is-dimmed', !connected)
    })
    workNodes.forEach((workNode) => {
      const connected = projectIds.includes(workNode.dataset.project)
      workNode.classList.toggle('is-highlighted', connected)
      workNode.classList.toggle('is-dimmed', !connected)
    })
    edges.forEach((edge) => {
      const connected = selectedSkill ? edge.dataset.skill === selectedSkill : edge.dataset.project === selectedProject
      edge.classList.toggle('is-highlighted', connected)
      edge.classList.toggle('is-dimmed', !connected)
    })
  }

  skillNodes.concat(workNodes).forEach((node) => {
    node.addEventListener('pointerenter', () => {
      if (!pinnedNode) highlight(node)
    })
    node.addEventListener('pointerleave', () => {
      if (!pinnedNode && !node.matches(':focus')) clearHighlights()
    })
    node.addEventListener('focus', () => {
      if (!pinnedNode) highlight(node)
    })
    node.addEventListener('blur', () => {
      if (!pinnedNode) clearHighlights()
    })
    node.addEventListener('click', () => {
      if (pinnedNode === node) {
        pinnedNode = null
        clearHighlights()
      } else {
        pinnedNode = node
        clearHighlights()
        highlight(node)
        node.setAttribute('aria-pressed', 'true')
      }
    })
  })

  const observer = new ResizeObserver(drawEdges)
  observer.observe(network)
  requestAnimationFrame(drawEdges)
  return observer
}

async function render() {
  const requested = window.location.hash.slice(1).replace(/^\//, '') || 'home'
  const route = Object.hasOwn(pageTitles, requested) ? requested : 'home'
  const thisRender = ++renderRequest
  const app = document.querySelector('#app')

  document.querySelectorAll('.main-nav a').forEach((link) => {
    if (link.dataset.route === route) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  })

  try {
    const response = await fetch(`pages/${route}.html`)
    if (!response.ok) throw new Error(`Could not load pages/${route}.html`)
    const page = await response.text()
    if (thisRender !== renderRequest) return
    if (skillsNetworkObserver) skillsNetworkObserver.disconnect()
    app.innerHTML = page
    skillsNetworkObserver = initSkillsNetwork(app)
    document.title = `${pageTitles[route]} — Software, research & ideas`
    window.scrollTo({ top: 0, behavior: 'instant' })
  } catch (error) {
    if (thisRender !== renderRequest) return
    console.error(error)
    app.innerHTML = '<section class="page"><h1>This page could not be loaded.</h1><p>Try refreshing the page.</p></section>'
  }
}

window.addEventListener('hashchange', render)
render()
